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

    // Must provide either token OR (saleId + email)
    if (!token && (!saleId || !email)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields. Provide token OR (saleId + email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query based on provided credentials
    let query = supabase
      .from("sales")
      .select(`
        id,
        status,
        buyer_email,
        total_amount,
        created_at,
        delivery_access_token,
        delivered_at,
        delivery_method,
        buyer_access_count,
        refund_eligible_until,
        payment_reference,
        products (
          id,
          title,
          description,
          file_url,
          external_url,
          cover_image_url,
          vendor_id,
          profiles (full_name, email)
        )
      `)
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

    // Check if refund period is still active
    const now = new Date();
    const refundEligible = sale.refund_eligible_until ? new Date(sale.refund_eligible_until) > now : false;

    // Get client IP for logging (if available)
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Log the access
    await supabase.from("delivery_logs").insert({
      sale_id: sale.id,
      access_method: token ? "direct_token" : "email_lookup",
      ip_address: clientIp,
      user_agent: userAgent,
    });

    // Increment access count
    await supabase
      .from("sales")
      .update({ buyer_access_count: (sale.buyer_access_count || 0) + 1 })
      .eq("id", sale.id);

    // Return sale data with delivery info
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
          accessCount: (sale.buyer_access_count || 0) + 1,
        },
        product: {
          id: sale.products.id,
          title: sale.products.title,
          description: sale.products.description,
          fileUrl: sale.products.file_url,
          externalUrl: sale.products.external_url,
          coverImageUrl: sale.products.cover_image_url,
          vendorName: sale.products.profiles?.full_name || "Vendor",
          vendorEmail: sale.products.profiles?.email,
        },
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
