import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, saleId, email } = await req.json();

    if (!token && (!saleId || !email)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields. Provide token OR (saleId + email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query - fetch sale first, then product separately
    let query = supabase
      .from("sales")
      .select("*")
      .eq("status", "completed");

    if (token) {
      query = query.eq("delivery_access_token", token);
    } else {
      query = query.eq("id", saleId).eq("buyer_email", email.toLowerCase().trim());
    }

    const { data: sale, error: saleError } = await query.single();

    if (saleError || !sale) {
      return new Response(
        JSON.stringify({ error: "Purchase not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          refundEligibleUntil: sale.refund_eligible_until,
          refundEligible,
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