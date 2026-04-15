import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 503,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { email, amount, productId, affiliateCode, buyerName, callbackUrl } = await req.json();

    if (!email || !amount || !productId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Initialize Paystack transaction
    const reference = `VP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses kobo
        reference,
        callback_url: callbackUrl || undefined,
        metadata: {
          product_id: productId,
          affiliate_code: affiliateCode || null,
          buyer_name: buyerName || null,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack error:", paystackData);
      return new Response(JSON.stringify({ error: paystackData.message || "Payment initialization failed" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      reference,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
    }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
