import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authFailureResponse, isTrustedInternalRequest } from "../_shared/auth.ts";

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
  requiredAmountKobo?: number;
  receivedAmountKobo?: number;
  paystackFeeKobo?: number;
  paystackTransactionId?: number | null;
  affiliateProcessingFeeKobo?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isTrustedInternalRequest(req)) {
    return authFailureResponse(corsHeaders, "Internal authorization required");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      productId, buyerEmail, buyerName, affiliateCode, paymentReference,
      paymentGateway = "paystack", couponCode,
      requiredAmountKobo, receivedAmountKobo, paystackFeeKobo, paystackTransactionId,
      affiliateProcessingFeeKobo: requestedAffiliateProcessingFeeKobo,
    }: ProcessSaleRequest = await req.json();

    if (!productId || !buyerEmail || !paymentReference) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedBuyerEmail = buyerEmail.trim().toLowerCase();
    const { data: pendingPayment, error: pendingPaymentError } = await supabase
      .from("pending_payments")
      .select("reference, purpose, status, email, metadata, expected_amount_kobo, received_amount_kobo, customer_processing_fee_kobo, vendor_processing_fee_kobo, affiliate_processing_fee_kobo, paystack_fee_kobo")
      .eq("reference", paymentReference)
      .maybeSingle();

    if (pendingPaymentError || !pendingPayment || pendingPayment.purpose !== "sale") {
      return new Response(JSON.stringify({ error: "Payment reference is not authorized for sale processing" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pendingMetadata = (pendingPayment.metadata || {}) as Record<string, unknown>;
    const pendingProductId = typeof pendingMetadata.product_id === "string" ? pendingMetadata.product_id : null;
    const pendingBuyerEmail = typeof pendingPayment.email === "string" ? pendingPayment.email.trim().toLowerCase() : null;
    if (pendingProductId && pendingProductId !== productId) {
      return new Response(JSON.stringify({ error: "Payment does not match the requested product" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pendingBuyerEmail && pendingBuyerEmail !== normalizedBuyerEmail) {
      return new Response(JSON.stringify({ error: "Payment does not match the requested buyer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("payment_reference", paymentReference)
      .maybeSingle();
    if (existingSale) {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true, saleId: existingSale.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pendingPayment.status !== "pending" && pendingPayment.status !== "processing") {
      return new Response(JSON.stringify({ error: "Payment is not in a processable state" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // RATE LIMITING: Max 5 sales per email per hour (prevent abuse)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPurchases } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("buyer_email", normalizedBuyerEmail)
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

          if (affiliateProfile?.email?.toLowerCase() === normalizedBuyerEmail) {
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
    const totalAmount = Math.max(0, product.price - discountAmount);
    const platformFeePercent = 5;


    // CORRECT COMMISSION FORMULA (industry-standard):
    //   platform_fee       = total * platform_fee_percent / 100
    //   affiliate_commission = total * commission_percent / 100   (% OF SALE PRICE, not of net)
    //   vendor_earnings    = total - platform_fee - affiliate_commission
    const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
    const paymentProcessingFeeBearer = pendingMetadata.payment_processing_fee_bearer === "vendor_affiliate_split_50_50"
      ? "vendor_affiliate_split_50_50"
      : "vendor";
    const verifiedPaystackFeeKobo = Math.max(0, Number(paystackFeeKobo ?? pendingPayment.paystack_fee_kobo ?? 0));
    const estimatedAffiliateFeeKobo = Math.max(0, Number(requestedAffiliateProcessingFeeKobo ?? pendingPayment.affiliate_processing_fee_kobo ?? pendingMetadata.affiliate_processing_fee_kobo ?? 0));
    const affiliateProcessingFeeKobo = affiliateId && paymentProcessingFeeBearer === "vendor_affiliate_split_50_50"
      ? Math.min(Math.floor(verifiedPaystackFeeKobo / 2), estimatedAffiliateFeeKobo || Math.floor(verifiedPaystackFeeKobo / 2))
      : 0;
    const vendorProcessingFeeKobo = Math.max(0, verifiedPaystackFeeKobo - affiliateProcessingFeeKobo);
    const grossAffiliateCommission = affiliateId
      ? Math.round((totalAmount * commissionPercent) / 100)
      : 0;
    const affiliateCommission = Math.max(0, grossAffiliateCommission - (affiliateProcessingFeeKobo / 100));
    let vendorEarnings = Math.max(0, totalAmount - platformFee - grossAffiliateCommission - (vendorProcessingFeeKobo / 100));


    const refundEligibleUntil = new Date();
    refundEligibleUntil.setDate(refundEligibleUntil.getDate() + product.refund_window_days);
    const deliveryAccessToken = crypto.randomUUID();

    // ======== ATOMIC VERIFIED SALE + WALLET UPDATES ========
    // This RPC preserves the existing calculations and starter-plan deduction,
    // but commits the sale, deduction, and all wallet credits as one transaction.
    // The payment-reference unique constraint makes callback/webhook retries safe.
    const { data: saleResult, error: saleError } = await supabase.rpc("create_verified_sale", {
      _product_id: productId,
      _vendor_id: product.vendor_id,
      _affiliate_id: affiliateId,
      _buyer_email: normalizedBuyerEmail,
      _total_amount: totalAmount,
      _platform_fee: platformFee,
      _affiliate_commission: affiliateCommission,
      _vendor_earnings_before_onboarding: vendorEarnings,
      _commission_percent_snapshot: commissionPercent,
      _platform_fee_percent_snapshot: platformFeePercent,
      _refund_eligible_until: refundEligibleUntil.toISOString(),
      _delivery_access_token: deliveryAccessToken,
      _payment_reference: paymentReference,
      _payment_gateway: paymentGateway,
      _payment_processing_fee_bearer: paymentProcessingFeeBearer,
      _required_amount_kobo: Number(requiredAmountKobo ?? pendingPayment.expected_amount_kobo ?? 0),
      _received_amount_kobo: Number(receivedAmountKobo ?? pendingPayment.received_amount_kobo ?? 0),
      _paystack_transaction_id: paystackTransactionId ?? null,
      _paystack_fee_kobo: verifiedPaystackFeeKobo,
      _customer_processing_fee_kobo: 0,
      _vendor_processing_fee_kobo: vendorProcessingFeeKobo,
      _affiliate_processing_fee_kobo: affiliateProcessingFeeKobo,
      _product_title: product.title,
    });

    if (saleError || !saleResult?.sale_id) {
      console.error("Error creating verified sale:", saleError);
      return new Response(JSON.stringify({ error: "Failed to process sale" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sale = { id: String(saleResult.sale_id) };
    const saleCreated = saleResult.created === true;
    vendorEarnings = Number(saleResult.vendor_earnings ?? vendorEarnings);

    // Counters are non-financial side effects and only advance for a new sale.
    if (saleCreated && affiliateLinkId) {
      await supabase.rpc("increment_conversion_count", { link_id: affiliateLinkId });
    }
    if (saleCreated && appliedCouponId) {
      await supabase.rpc("increment_coupon_usage", { coupon_id: appliedCouponId });
    }

    // ======== SEND RECEIPT EMAIL ========
    try {
      // Build delivery URL (will be generated when sale status becomes completed)
      // For now, the token will be generated by the trigger when admin marks it complete
      const baseUrl = Deno.env.get("SITE_URL") || "https://mirvyn.com";
      const deliveryUrl = `${baseUrl}/delivery?token=${encodeURIComponent(deliveryAccessToken)}`;

      await supabase.functions.invoke("send-email", {
        body: {
          to: normalizedBuyerEmail,
          subject: `Receipt: ${product.title} — Mirvyn`,
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

<p style="color:#666;font-size:12px;margin-top:24px">This is an automated receipt from Mirvyn.</p>`,
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
          vendor_earnings: vendorEarnings, commission_applied: commissionPercent,
          payment_processing_fee_bearer: paymentProcessingFeeBearer,
          paystack_fee: verifiedPaystackFeeKobo / 100,
          affiliate_processing_fee: affiliateProcessingFeeKobo / 100,
          vendor_processing_fee: vendorProcessingFeeKobo / 100,
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
