import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackClickRequest {
  code: string;
  referrer?: string;
  userAgent?: string;
  clickType?: "product" | "referral"; // Track what kind of click
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, referrer, userAgent, clickType = "product" }: TrackClickRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Affiliate code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create IP hash for duplicate detection and rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + new Date().toDateString());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // RATE LIMITING: Check for excessive clicks from same IP (max 100 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClicks, error: rateError } = await supabase
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (recentClicks && recentClicks > 100) {
      // Log potential abuse
      await supabase.from("fraud_events").insert({
        event_type: "rate_limit_exceeded",
        severity: "medium",
        related_type: "click",
        description: `IP exceeded click rate limit: ${recentClicks} clicks in 1 hour`,
        metadata: { ip_hash: ipHash, click_count: recentClicks },
        status: "flagged",
      });

      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the affiliate link by code
    const { data: link, error: linkError } = await supabase
      .from("affiliate_links")
      .select("id, product_id")
      .eq("unique_code", code)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ error: "Invalid affiliate code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if product is active and approved
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("status, is_approved")
      .eq("id", link.product_id)
      .single();

    if (productError || !product || product.status !== "active" || !product.is_approved) {
      return new Response(
        JSON.stringify({ error: "Product is not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Duplicate click filtering: check if same IP hash clicked this link today
    const { data: existingClick } = await supabase
      .from("clicks")
      .select("id")
      .eq("link_id", link.id)
      .eq("ip_hash", ipHash)
      .limit(1)
      .maybeSingle();

    if (existingClick) {
      // Still return success but don't count duplicate
      return new Response(
        JSON.stringify({ success: true, productId: link.product_id, duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the click record
    const { error: clickError } = await supabase.from("clicks").insert({
      link_id: link.id,
      ip_hash: ipHash,
      referrer: referrer || null,
      user_agent: userAgent || null,
    });

    if (clickError) {
      console.error("Error inserting click:", clickError);
    }

    return new Response(
      JSON.stringify({ success: true, productId: link.product_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error tracking click:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
