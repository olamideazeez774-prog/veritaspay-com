import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAndActivate } from "../_shared/verify-payment.ts";
import { clientIpHash, isRateLimited } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const reference: string = body.reference || body.trxref;

    if (typeof reference !== "string" || reference.length === 0 || reference.length > 128) {
      return new Response(JSON.stringify({ error: "Invalid payment reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: verification is idempotent but each call hits Paystack's
    // verify API — cap hammering per IP and per reference (fail-open).
    const ipHash = await clientIpHash(req);
    if (await isRateLimited(supabase, `cb-ip:${ipHash}`, 60, 60 * 60 * 1000)
      || await isRateLimited(supabase, `cb-ref:${reference}`, 6, 60 * 60 * 1000)) {
      return new Response(JSON.stringify({ error: "Too many verification attempts. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await verifyAndActivate(supabase, PAYSTACK_SECRET_KEY, reference, {
      productId: body.productId,
      buyerEmail: body.buyerEmail,
      buyerName: body.buyerName,
      affiliateCode: body.affiliateCode,
      couponCode: body.couponCode,
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("paystack-callback error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
