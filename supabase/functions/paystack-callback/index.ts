import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CallbackRequest {
  reference: string;
  trxref?: string;
  productId: string;
  buyerEmail: string;
  buyerName?: string;
  affiliateCode?: string;
  couponCode?: string;
  finalPrice: number;
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

    const {
      reference,
      productId,
      buyerEmail,
      buyerName,
      affiliateCode,
      couponCode,
      finalPrice,
    }: CallbackRequest = await req.json();

    if (!reference || !productId || !buyerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const paystackData = await verifyRes.json();

    if (!verifyRes.ok || !paystackData.status) {
      console.error("Paystack verification failed:", paystackData);
      return new Response(
        JSON.stringify({ error: paystackData?.message || "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status
    const transactionStatus = paystackData.data?.status;
    const amountPaid = paystackData.data?.amount || 0;
    const expectedAmount = Math.round(finalPrice * 100); // Paystack uses kobo

    if (transactionStatus !== "success") {
      return new Response(
        JSON.stringify({ error: `Payment not successful. Status: ${transactionStatus}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches (with small tolerance for currency conversion)
    const amountDiff = Math.abs(amountPaid - expectedAmount);
    if (amountDiff > 100) { // 1 naira tolerance
      console.warn(`Amount mismatch: expected ${expectedAmount}, got ${amountPaid}`);
      // Log fraud attempt but don't block for now
      await supabase.from("fraud_events").insert({
        event_type: "payment_amount_mismatch",
        severity: "medium",
        related_id: productId,
        related_type: "product",
        description: `Payment amount mismatch: expected ₦${finalPrice}, reference: ${reference}`,
        status: "flagged",
      });
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
