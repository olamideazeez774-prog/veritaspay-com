import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Throttle successful delivery lookups per IP: 30/hour per sale. delivery_logs
// requires a real sale_id, so only resolved accesses are logged — but a resolved
// access is the meaningful thing to throttle (token guessing is impractical at
// 128 bits, while a leaked token must not be hammerable).
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + new Date().toDateString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (typeof token !== "string" || token.length < 32 || token.length > 128) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing delivery access token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delivery links are bearer credentials. Never fall back to predictable sale IDs
    // plus email addresses, which are not sufficient proof of purchase ownership.
    const query = supabase
      .from("sales")
      .select("id, buyer_email, total_amount, created_at, payment_reference, delivery_access_token, delivery_method, delivered_at, refund_eligible_until, buyer_access_count, product_id")
      .eq("status", "completed")
      .eq("delivery_access_token", token);

    const { data: sale, error: saleError } = await query.single();

    if (saleError || !sale) {
      return new Response(
        JSON.stringify({ error: "Purchase not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Per-IP throttling + audit trail (post-resolution; sale_id is NOT NULL) ----
    // SECURITY SEAL: LAST XFF entry (trusted proxy value), not the first
    // (client-spoofable), so throttle rotation via header forgery fails.
    const xffParts = (req.headers.get("x-forwarded-for") || "").split(",");
    const clientIp =
      (xffParts.length > 1 ? xffParts[xffParts.length - 1] : xffParts[0] || "").trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const ipHash = await hashIp(clientIp);

    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentLookups, error: rateCheckError } = await supabase
      .from("delivery_logs")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipHash)
      .eq("sale_id", sale.id)
      .gte("accessed_at", oneHourAgo);

    if (!rateCheckError && (recentLookups ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort logging: a logging failure must never block a legitimate buyer.
    const { error: logError } = await supabase.from("delivery_logs").insert({
      sale_id: sale.id,
      access_method: "direct_token",
      ip_address: ipHash,
      user_agent: req.headers.get("user-agent") || null,
    });
    if (logError) console.warn("delivery log insert failed (non-blocking)", logError.message);

    // Fetch product separately
    const { data: product } = await supabase
      .from("products")
      .select("id, title, description, file_url, external_url, cover_image_url, vendor_id")
      .eq("id", sale.product_id)
      .single();

    // Fetch vendor profile
    let vendorName = "Vendor";
    let vendorEmail = null;
    if (product?.vendor_id) {
      const { data: vendorProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", product.vendor_id)
        .single();
      if (vendorProfile) {
        vendorName = vendorProfile.full_name || "Vendor";
        vendorEmail = vendorProfile.email;
      }
    }

    const now = new Date();
    const refundEligible = sale.refund_eligible_until ? new Date(sale.refund_eligible_until) > now : false;

    return new Response(
      JSON.stringify({
        success: true,
        sale: {
          id: sale.id,
          buyerEmail: sale.buyer_email,
          totalAmount: sale.total_amount,
          createdAt: sale.created_at,
          paymentReference: sale.payment_reference,
          deliveryToken: sale.delivery_access_token,
          deliveryMethod: sale.delivery_method,
          deliveredAt: sale.delivered_at,
          refundEligibleUntil: sale.refund_eligible_until,
          refundEligible,
          accessCount: sale.buyer_access_count || 0,
        },
        product: product ? {
          id: product.id,
          title: product.title,
          description: product.description,
          fileUrl: product.file_url,
          externalUrl: product.external_url,
          coverImageUrl: product.cover_image_url,
          vendorName,
          vendorEmail,
        } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-delivery:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});