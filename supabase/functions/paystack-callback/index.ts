import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CallbackRequest {
  reference: string;
  trxref?: string;
  productId?: string;
  buyerEmail?: string;
  buyerName?: string;
  affiliateCode?: string;
  couponCode?: string;
  finalPrice?: number;
  purpose?: "sale" | "verification" | "listing_fee" | "vendor_onboarding" | "affiliate_membership";
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CallbackRequest = await req.json();
    const purpose = body.purpose || "sale";
    const { reference } = body;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const paystackData = await verifyRes.json();
    if (!verifyRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: paystackData?.message || "Payment not successful" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const amountPaidKobo = paystackData.data?.amount || 0;

    // Non-sale purposes: handle and return early
    if (purpose === "verification") {
      const userId = body.userId || paystackData.data?.metadata?.user_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id for verification" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase
        .from("verification_requests")
        .update({ payment_reference: reference, status: "pending" })
        .eq("user_id", userId)
        .eq("path", "paid")
        .is("payment_reference", null);
      return new Response(JSON.stringify({ success: true, purpose, redirect: "/dashboard/settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purpose === "listing_fee") {
      const userId = body.userId || paystackData.data?.metadata?.user_id;
      const productId = body.productId || paystackData.data?.metadata?.product_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("product_listing_payments").insert({
        vendor_id: userId,
        product_id: productId || null,
        amount: amountPaidKobo / 100,
        payment_reference: reference,
        payment_gateway: "paystack",
        status: "verified",
      });
      return new Response(JSON.stringify({ success: true, purpose, redirect: "/dashboard/products" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purpose === "vendor_onboarding") {
      const userId = body.userId || paystackData.data?.metadata?.user_id;
      if (userId) {
        await supabase.rpc("deduct_onboarding_balance", { _vendor_id: userId, _max_deduction: amountPaidKobo / 100 });
      }
      return new Response(JSON.stringify({ success: true, purpose, redirect: "/dashboard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purpose === "affiliate_membership") {
      const userId = body.userId || paystackData.data?.metadata?.user_id;
      if (userId) {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("profiles").update({ affiliate_membership_expires_at: expiresAt }).eq("id", userId);
      }
      return new Response(JSON.stringify({ success: true, purpose, redirect: "/dashboard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sale flow (default)
    const { productId, buyerEmail, buyerName, affiliateCode, couponCode } = body;

    if (!reference || !productId || !buyerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Recompute expected price server-side. Never trust the client.
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, price, vendor_id")
      .eq("id", productId)
      .maybeSingle();
    if (productErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let serverFinalPrice = Number(product.price);
    if (couponCode) {
      const { data: coupon } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("code", String(couponCode).toUpperCase().trim())
        .eq("is_active", true)
        .eq("vendor_id", product.vendor_id)
        .maybeSingle();
      if (coupon) {
        const validProduct = !coupon.product_id || coupon.product_id === productId;
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const hasUses = !coupon.max_uses || coupon.current_uses < coupon.max_uses;
        if (validProduct && notExpired && hasUses) {
          if (coupon.discount_percent > 0) {
            serverFinalPrice = Math.max(0, serverFinalPrice - Math.round(serverFinalPrice * (coupon.discount_percent / 100)));
          } else if (coupon.discount_amount > 0) {
            serverFinalPrice = Math.max(0, serverFinalPrice - Number(coupon.discount_amount));
          }
        }
      }
    }

    // (Already verified above for purpose=sale) Use paystackData
    const transactionStatus = paystackData.data?.status;
    const amountPaid = paystackData.data?.amount || 0;
    const expectedAmount = Math.round(serverFinalPrice * 100); // server-computed kobo

    if (transactionStatus !== "success") {
      return new Response(
        JSON.stringify({ error: `Payment not successful. Status: ${transactionStatus}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountDiff = Math.abs(amountPaid - expectedAmount);
    if (amountDiff > 100) { // 1 naira tolerance
      console.warn(`Amount mismatch: expected ${expectedAmount}, got ${amountPaid}`);
      await supabase.from("fraud_events").insert({
        event_type: "payment_amount_mismatch",
        severity: "high",
        related_id: productId,
        related_type: "product",
        description: `Payment amount mismatch: expected ₦${serverFinalPrice}, paid kobo ${amountPaid}, ref: ${reference}`,
        status: "blocked",
      });
      return new Response(
        JSON.stringify({ error: "Payment amount mismatch — sale rejected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentVerified = true;

    // Check if sale already exists for this reference (idempotency)
    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existingSale) {
      return new Response(
        JSON.stringify({
          success: true,
          saleId: existingSale.id,
          message: "Sale already processed",
          alreadyExists: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call process-sale to create the sale record
    const { data: saleResult, error: saleError } = await supabase.functions.invoke("process-sale", {
      body: {
        productId,
        buyerEmail,
        buyerName,
        affiliateCode,
        paymentReference: reference,
        paymentGateway: "paystack",
        couponCode,
      },
    });

    if (saleError) {
      console.error("Error calling process-sale:", saleError);
      return new Response(
        JSON.stringify({ error: "Failed to process sale after payment verification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (saleResult?.error) {
      return new Response(
        JSON.stringify({ error: saleResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        saleId: saleResult?.saleId,
        message: "Payment verified and sale processed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in paystack-callback:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
