import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessSaleRequest {
  productId: string;
  buyerEmail: string;
  buyerName?: string;
  affiliateCode?: string;
  paymentReference: string;
  paymentGateway?: string;
  couponCode?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      productId, buyerEmail, buyerName, affiliateCode, paymentReference,
      paymentGateway = "paystack", couponCode,
    }: ProcessSaleRequest = await req.json();

    if (!productId || !buyerEmail || !paymentReference) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // RATE LIMITING: Max 5 sales per email per hour (prevent abuse)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPurchases } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("buyer_email", buyerEmail.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (recentPurchases && recentPurchases > 5) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the product
    const { data: product, error: productError } = await supabase
      .from("products").select("*").eq("id", productId).eq("status", "active").eq("is_approved", true).single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Product not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ======== COUPON VALIDATION ========
    let discountAmount = 0;
    let appliedCouponId: string | null = null;

    if (couponCode) {
      const { data: coupon } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .eq("vendor_id", product.vendor_id)
        .maybeSingle();

      if (coupon) {
        const isValidProduct = !coupon.product_id || coupon.product_id === productId;
        const isNotExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const hasUsesLeft = !coupon.max_uses || coupon.current_uses < coupon.max_uses;

        if (isValidProduct && isNotExpired && hasUsesLeft) {
          if (coupon.discount_percent > 0) {
            discountAmount = Math.round(product.price * (coupon.discount_percent / 100));
          } else if (coupon.discount_amount > 0) {
            discountAmount = Math.min(coupon.discount_amount, product.price);
          }
          appliedCouponId = coupon.id;
        }
      }
    }

    // ======== AFFILIATE LOOKUP ========
    let affiliateId: string | null = null;
    let affiliateLinkId: string | null = null;

    if (affiliateCode) {
      const { data: affiliateLink } = await supabase
        .from("affiliate_links").select("id, affiliate_id")
        .eq("unique_code", affiliateCode.toUpperCase()).eq("product_id", productId).single();

      if (affiliateLink) {
        if (affiliateLink.affiliate_id === product.vendor_id) {
          console.warn("Self-referral blocked: affiliate is the vendor");
        } else {
          const { data: affiliateProfile } = await supabase
            .from("profiles").select("email").eq("id", affiliateLink.affiliate_id).single();

          if (affiliateProfile?.email?.toLowerCase() === buyerEmail.toLowerCase()) {
            console.warn("Self-referral blocked: buyer is the affiliate");
            await supabase.from("fraud_events").insert({
              event_type: "self_referral", severity: "high", user_id: affiliateLink.affiliate_id,
              related_id: productId, related_type: "product",
              description: `Self-referral attempt: affiliate tried to purchase own referral link for "${product.title}"`,
              status: "flagged",
            });
          } else {
            affiliateId = affiliateLink.affiliate_id;
            affiliateLinkId = affiliateLink.id;
          }
        }
      }
    }

    // ======== COMMISSION LOGIC ========
    let commissionPercent = product.commission_percent;

    if (affiliateId) {
      const { data: thresholdRules } = await supabase
        .from("commission_rules").select("*")
        .eq("rule_type", "weekly_threshold").eq("is_active", true)
        .order("priority", { ascending: false }).limit(1);

      if (thresholdRules?.length) {
        const rule = thresholdRules[0];
        const minSales = rule.min_sales || 15;
        const overridePercent = rule.commission_override || 40;
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { count: thisWeekSales } = await supabase
          .from("sales").select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId).gte("created_at", weekStart.toISOString());

        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const { count: lastWeekSales } = await supabase
          .from("sales").select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId)
          .gte("created_at", lastWeekStart.toISOString())
          .lt("created_at", weekStart.toISOString());

        if ((thisWeekSales || 0) >= minSales || (lastWeekSales || 0) >= minSales) {
          commissionPercent = Math.max(commissionPercent, overridePercent);
        }
      }

      const { data: affiliateRules } = await supabase
        .from("commission_rules").select("*")
        .eq("rule_type", "per_affiliate").eq("affiliate_id", affiliateId).eq("is_active", true)
        .order("priority", { ascending: false }).limit(1);

      if (affiliateRules?.length && affiliateRules[0].commission_override) {
        commissionPercent = Math.max(commissionPercent, affiliateRules[0].commission_override);
      }
    }

    // ======== CALCULATE AMOUNTS ========
    const { data: vendorAdminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", product.vendor_id).eq("role", "admin").maybeSingle();
    const isVendorAdmin = !!vendorAdminRole;

    const totalAmount = Math.max(0, product.price - discountAmount);
    const platformFeePercent = isVendorAdmin ? 0 : product.platform_fee_percent;
    const secondTierCommissionPercent = product.second_tier_commission_percent || 5;

    const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
    const afterPlatformFee = totalAmount - platformFee;

    const affiliateCommission = affiliateId
      ? Math.round((afterPlatformFee * commissionPercent) / 100)
      : 0;

    const vendorEarnings = afterPlatformFee - affiliateCommission;

    // Second-tier commission
    let secondTierAffiliateId: string | null = null;
    let secondTierCommission = 0;

    const { data: vendorReferral } = await supabase
      .from("platform_referrals").select("referrer_id").eq("referred_user_id", product.vendor_id).maybeSingle();

    if (vendorReferral) {
      const { data: referrerRole } = await supabase
        .from("user_roles").select("role").eq("user_id", vendorReferral.referrer_id).eq("role", "affiliate").maybeSingle();
      if (referrerRole) {
        secondTierAffiliateId = vendorReferral.referrer_id;
        secondTierCommission = Math.round((platformFee * secondTierCommissionPercent) / 100);
      }
    }

    const refundEligibleUntil = new Date();
    refundEligibleUntil.setDate(refundEligibleUntil.getDate() + product.refund_window_days);

    // ======== CREATE SALE ========
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        product_id: productId, vendor_id: product.vendor_id, affiliate_id: affiliateId,
        second_tier_affiliate_id: secondTierAffiliateId, buyer_email: buyerEmail,
        total_amount: totalAmount, platform_fee: platformFee,
        affiliate_commission: affiliateCommission, second_tier_commission: secondTierCommission,
        vendor_earnings: vendorEarnings, commission_percent_snapshot: commissionPercent,
        platform_fee_percent_snapshot: platformFeePercent, status: "pending",
        refund_eligible_until: refundEligibleUntil.toISOString(),
        payment_reference: paymentReference, payment_gateway: paymentGateway,
      })
      .select().single();

    if (saleError) {
      console.error("Error creating sale:", saleError);
      return new Response(JSON.stringify({ error: "Failed to process sale" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Increment conversion count
    if (affiliateLinkId) {
      await supabase.rpc("increment_conversion_count", { link_id: affiliateLinkId });
    }

    // Increment coupon usage
    if (appliedCouponId) {
      await supabase
        .from("vendor_coupons")
        .update({ current_uses: (await supabase.from("vendor_coupons").select("current_uses").eq("id", appliedCouponId).single()).data?.current_uses + 1 || 1 })
        .eq("id", appliedCouponId);
    }

    // ======== WALLET UPDATES ========
    const updateWallet = async (userId: string, amount: number, type: string, description: string) => {
      const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", userId).single();
      if (wallet) {
        await supabase.from("transactions").insert({
          wallet_id: wallet.id, sale_id: sale.id, amount, type, earning_state: "pending", description,
        });
        await supabase.rpc("increment_pending_balance", { _wallet_id: wallet.id, _amount: amount });
      }
    };

    await updateWallet(product.vendor_id, vendorEarnings, "sale_vendor", `Sale of ${product.title}`);

    if (affiliateId && affiliateCommission > 0) {
      await updateWallet(affiliateId, affiliateCommission, "sale_commission", `Commission from ${product.title}`);
    }

    if (secondTierAffiliateId && secondTierCommission > 0) {
      await updateWallet(secondTierAffiliateId, secondTierCommission, "sale_commission", `Second-tier commission from ${product.title}`);
    }

    // ======== SEND RECEIPT EMAIL ========
    try {
      // Build delivery URL (will be generated when sale status becomes completed)
      // For now, the token will be generated by the trigger when admin marks it complete
      const baseUrl = Deno.env.get("SITE_URL") || "https://avenyx.com";
      const deliveryUrl = `${baseUrl}/delivery?sale=${sale.id}&email=${encodeURIComponent(buyerEmail)}`;

      await supabase.functions.invoke("send-email", {
        body: {
          to: buyerEmail,
          subject: `Receipt: ${product.title} — PayThos`,
          html: `<h2>Thank you for your purchase!</h2>
<p>Hi ${buyerName || "there"},</p>
<p>Your purchase of <strong>${product.title}</strong> has been confirmed.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border-bottom:1px solid #eee">Product</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${product.title}</strong></td></tr>
${discountAmount > 0 ? `<tr><td style="padding:8px;border-bottom:1px solid #eee">Discount</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green">-₦${discountAmount.toLocaleString()}</td></tr>` : ""}
<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Total Paid</strong></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>₦${totalAmount.toLocaleString()}</strong></td></tr>
<tr><td style="padding:8px">Reference</td><td style="padding:8px;text-align:right;font-family:monospace">${paymentReference}</td></tr>
</table>

<div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
  <h3 style="margin:0 0 8px 0;font-size:16px">📦 Access Your Purchase</h3>
  <p style="margin:0 0 12px 0;font-size:14px;color:#64748b">Click the button below to access your product:</p>
  <a href="${deliveryUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">Access My Product</a>
</div>

<p style="font-size:13px;color:#64748b">
  <strong>Permanent Access Link:</strong><br>
  Save this link to access your purchase anytime: <a href="${deliveryUrl}">${deliveryUrl}</a>
</p>

<p style="color:#666;font-size:12px;margin-top:24px">This is an automated receipt from PayThos.</p>`,
        },
      });
    } catch (emailErr) {
      console.error("Email send failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true, saleId: sale.id, message: "Sale processed successfully",
        breakdown: {
          original_price: product.price, discount: discountAmount,
          total_amount: totalAmount, platform_fee: platformFee,
          affiliate_commission: affiliateCommission,
          second_tier_commission: secondTierCommission,
          vendor_earnings: vendorEarnings, commission_applied: commissionPercent,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing sale:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
