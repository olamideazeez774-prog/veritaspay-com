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
      productId,
      buyerEmail,
      buyerName,
      affiliateCode,
      paymentReference,
      paymentGateway = "paystack",
    }: ProcessSaleRequest = await req.json();

    // Validate required fields
    if (!productId || !buyerEmail || !paymentReference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the product with vendor info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("status", "active")
      .eq("is_approved", true)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up affiliate if code provided
    let affiliateId: string | null = null;
    let affiliateLinkId: string | null = null;

    if (affiliateCode) {
      const { data: affiliateLink } = await supabase
        .from("affiliate_links")
        .select("id, affiliate_id")
        .eq("unique_code", affiliateCode.toUpperCase())
        .eq("product_id", productId)
        .single();

      if (affiliateLink) {
        affiliateId = affiliateLink.affiliate_id;
        affiliateLinkId = affiliateLink.id;
      }
    }

    // Calculate amounts
    const totalAmount = product.price;
    const platformFeePercent = product.platform_fee_percent;
    const commissionPercent = product.commission_percent;
    const secondTierCommissionPercent = product.second_tier_commission_percent || 5;

    // Platform fee is calculated first from total
    const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
    const afterPlatformFee = totalAmount - platformFee;

    // Commission is calculated from what remains after platform fee (if there's an affiliate)
    const affiliateCommission = affiliateId
      ? Math.round((afterPlatformFee * commissionPercent) / 100)
      : 0;

    // Vendor gets the rest
    const vendorEarnings = afterPlatformFee - affiliateCommission;

    // Check for second-tier commission (if vendor was referred by an affiliate)
    let secondTierAffiliateId: string | null = null;
    let secondTierCommission = 0;

    const { data: vendorReferral } = await supabase
      .from("platform_referrals")
      .select("referrer_id")
      .eq("referred_user_id", product.vendor_id)
      .single();

    if (vendorReferral) {
      // Check if referrer is still an affiliate
      const { data: referrerRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", vendorReferral.referrer_id)
        .eq("role", "affiliate")
        .single();

      if (referrerRole) {
        secondTierAffiliateId = vendorReferral.referrer_id;
        // Second-tier commission comes from platform fee portion
        secondTierCommission = Math.round((platformFee * secondTierCommissionPercent) / 100);
      }
    }

    // Calculate refund eligibility date
    const refundEligibleUntil = new Date();
    refundEligibleUntil.setDate(refundEligibleUntil.getDate() + product.refund_window_days);

    // Create the sale record
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        product_id: productId,
        vendor_id: product.vendor_id,
        affiliate_id: affiliateId,
        second_tier_affiliate_id: secondTierAffiliateId,
        buyer_email: buyerEmail,
        total_amount: totalAmount,
        platform_fee: platformFee,
        affiliate_commission: affiliateCommission,
        second_tier_commission: secondTierCommission,
        vendor_earnings: vendorEarnings,
        commission_percent_snapshot: commissionPercent,
        platform_fee_percent_snapshot: platformFeePercent,
        status: "pending", // Will be "completed" after refund window
        refund_eligible_until: refundEligibleUntil.toISOString(),
        payment_reference: paymentReference,
        payment_gateway: paymentGateway,
      })
      .select()
      .single();

    if (saleError) {
      console.error("Error creating sale:", saleError);
      return new Response(
        JSON.stringify({ error: "Failed to process sale" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update affiliate link conversion count
    if (affiliateLinkId) {
      await supabase.rpc("increment_conversion_count", { link_id: affiliateLinkId });
    }

    // Helper function to update wallet
    const updateWallet = async (userId: string, amount: number, type: string, description: string) => {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (wallet) {
        await supabase.from("transactions").insert({
          wallet_id: wallet.id,
          sale_id: sale.id,
          amount,
          type,
          earning_state: "pending",
          description,
        });

        await supabase.rpc("increment_pending_balance", { 
          _wallet_id: wallet.id, 
          _amount: amount 
        });
      }
    };

    // Update vendor wallet
    await updateWallet(
      product.vendor_id,
      vendorEarnings,
      "sale_vendor",
      `Sale of ${product.title}`
    );

    // Update affiliate wallet if applicable
    if (affiliateId && affiliateCommission > 0) {
      await updateWallet(
        affiliateId,
        affiliateCommission,
        "sale_commission",
        `Commission from ${product.title}`
      );
    }

    // Update second-tier affiliate wallet if applicable
    if (secondTierAffiliateId && secondTierCommission > 0) {
      await updateWallet(
        secondTierAffiliateId,
        secondTierCommission,
        "sale_commission",
        `Second-tier commission from ${product.title}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        saleId: sale.id,
        message: "Sale processed successfully",
        breakdown: {
          total_amount: totalAmount,
          platform_fee: platformFee,
          affiliate_commission: affiliateCommission,
          second_tier_commission: secondTierCommission,
          vendor_earnings: vendorEarnings,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing sale:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
