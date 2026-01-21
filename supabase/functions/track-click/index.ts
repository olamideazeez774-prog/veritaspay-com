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
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, referrer, userAgent }: TrackClickRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Affiliate code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Create a hash of the IP for privacy (we don't store the actual IP)
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + new Date().toDateString());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Insert the click record
    const { error: clickError } = await supabase.from("clicks").insert({
      link_id: link.id,
      ip_hash: ipHash,
      referrer: referrer || null,
      user_agent: userAgent || null,
    });

    if (clickError) {
      console.error("Error inserting click:", clickError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        productId: link.product_id 
      }),
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
