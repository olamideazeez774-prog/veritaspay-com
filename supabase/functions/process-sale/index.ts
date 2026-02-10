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
      productId, buyerEmail, buyerName, affiliateCode, paymentReference, paymentGateway = "paystack",
    }: ProcessSaleRequest = await req.json();

    if (!productId || !buyerEmail || !paymentReference) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the product
    const { data: product, error: productError } = await supabase
      .from("products").select("*").eq("id", productId).eq("status", "active").eq("is_approved", true).single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Product not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up affiliate if code provided
    let affiliateId: string | null = null;
    let affiliateLinkId: string | null = null;

    if (affiliateCode) {
      const { data: affiliateLink } = await supabase
        .from("affiliate_links").select("id, affiliate_id")
        .eq("unique_code", affiliateCode.toUpperCase()).eq("product_id", productId).single();

      if (affiliateLink) {
        // Self-referral blocking: affiliate cannot earn commission on their own purchase
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

    // Weekly threshold commission logic
    let commissionPercent = product.commission_percent;

    if (affiliateId) {
      // Check if affiliate has a weekly threshold rule active
      const { data: thresholdRules } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("rule_type", "weekly_threshold")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(1);

      if (thresholdRules?.length) {
        const rule = thresholdRules[0];
        const minSales = rule.min_sales || 15;
        const overridePercent = rule.commission_override || 40;

        // Count this week's sales for the affiliate
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { count: thisWeekSales } = await supabase
          .from("sales").select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId).gte("created_at", weekStart.toISOString());

        // Check last week too for grace period
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const { count: lastWeekSales } = await supabase
          .from("sales").select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId)
          .gte("created_at", lastWeekStart.toISOString())
          .lt("created_at", weekStart.toISOString());

        const meetsThisWeek = (thisWeekSales || 0) >= minSales;
        const metLastWeek = (lastWeekSales || 0) >= minSales;

        // Forward-only: if they met threshold this week or last week (grace), upgrade
        if (meetsThisWeek || metLastWeek) {
          commissionPercent = Math.max(commissionPercent, overridePercent);
        }
      }

      // Also check per-affiliate overrides
      const { data: affiliateRules } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("rule_type", "per_affiliate")
        .eq("affiliate_id", affiliateId)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(1);

      if (affiliateRules?.length && affiliateRules[0].commission_override) {
        commissionPercent = Math.max(commissionPercent, affiliateRules[0].commission_override);
      }
    }

    // Check if vendor is admin (fee exempt)
    const { data: vendorAdminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", product.vendor_id).eq("role", "admin").maybeSingle();
    const isVendorAdmin = !!vendorAdminRole;

    // Calculate amounts
    const totalAmount = product.price;
    const platformFeePercent = isVendorAdmin ? 0 : product.platform_fee_percent;
    const secondTierCommissionPercent = product.second_tier_commission_percent || 5;

    const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
    const afterPlatformFee = totalAmount - platformFee;

    const affiliateCommission = affiliateId
      ? Math.round((afterPlatformFee * commissionPercent) / 100)
      : 0;

    const vendorEarnings = afterPlatformFee - affiliateCommission;

    // Check for second-tier commission
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

    // Create the sale record
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

    if (affiliateLinkId) {
      await supabase.rpc("increment_conversion_count", { link_id: affiliateLinkId });
    }

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

    return new Response(
      JSON.stringify({
        success: true, saleId: sale.id, message: "Sale processed successfully",
        breakdown: { total_amount: totalAmount, platform_fee: platformFee, affiliate_commission: affiliateCommission, second_tier_commission: secondTierCommission, vendor_earnings: vendorEarnings, commission_applied: commissionPercent },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing sale:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
