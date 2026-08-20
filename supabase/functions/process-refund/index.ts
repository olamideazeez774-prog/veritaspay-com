import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthenticatedUser, authFailureResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-function-secret, x-cron-secret",
};

interface RefundRequest {
  saleId: string;
  reason?: string;
  requestedBy?: string; // ignored; requester identity is derived from the verified JWT
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requester = await getAuthenticatedUser(req, supabase);
    if (!requester) return authFailureResponse(corsHeaders);
    const requesterId = requester.id;

    const { saleId, reason }: RefundRequest = await req.json();

    if (!saleId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: saleId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the sale with related data
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(`
        *,
        products (title, vendor_id, price),
        transactions (id, wallet_id, amount, type)
      `)
      .eq("id", saleId)
      .single();

    if (saleError || !sale) {
      return new Response(
        JSON.stringify({ error: "Sale not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already refunded
    if (sale.status === "refunded") {
      return new Response(
        JSON.stringify({ error: "Sale has already been refunded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if refund is still eligible
    const now = new Date();
    const refundEligibleUntil = sale.refund_eligible_until ? new Date(sale.refund_eligible_until) : null;
    
    if (refundEligibleUntil && refundEligibleUntil < now) {
      return new Response(
        JSON.stringify({ error: "Refund period has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requester has permission (admin or the vendor)
    const { data: requesterRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId);

    const isAdmin = requesterRoles?.some(r => r.role === "admin");
    const isVendor = requesterRoles?.some(r => r.role === "vendor") && sale.vendor_id === requesterId;

    if (!isAdmin && !isVendor) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins or the vendor can process refunds" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The sale status claim, wallet debits, and reversal rows are committed by
    // one database transaction. Any failure rolls back all changes, preventing
    // a refunded sale with only some wallets reversed.
    const { data: atomicResult, error: atomicRefundError } = await supabase.rpc("process_refund_atomic", {
      _sale_id: saleId,
      _reason: reason || "",
    });

    if (atomicRefundError) {
      const isConflict = atomicRefundError.message.includes("already refunded") || atomicRefundError.message.includes("not refundable");
      return new Response(
        JSON.stringify({ error: isConflict ? "Sale was already refunded or is not refundable" : "Refund transaction failed" }),
        { status: isConflict ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refundResults = {
      saleUpdated: true,
      transactionsReversed: Number(atomicResult?.transactions_reversed || 0),
      walletAdjustments: [] as string[],
      errors: [] as string[],
    };

    // 3. Log the refund event
    await supabase.from("system_logs").insert({
      event_type: "refund_processed",
      severity: "info",
      user_id: requesterId,
      related_id: saleId,
      related_type: "sale",
      description: `Refund processed for sale ${saleId}. Reason: ${reason || "Not specified"}`,
      metadata: {
        sale_id: saleId,
        reason,
        requested_by: requesterId,
        total_amount: sale.total_amount,
        results: refundResults,
      },
    });

    // 4. Send refund notification email to buyer
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: sale.buyer_email,
          subject: `Refund Processed: ${sale.products?.title || "Your Purchase"} — Mirvyn`,
          html: `<h2>Refund Confirmation</h2>
<p>Hi there,</p>
<p>Your refund for <strong>${sale.products?.title || "your purchase"}</strong> has been processed.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border-bottom:1px solid #eee">Order Reference</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${sale.payment_reference}</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee">Amount Refunded</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>₦${parseFloat(sale.total_amount).toLocaleString()}</strong></td></tr>
<tr><td style="padding:8px">Refund Date</td><td style="padding:8px;text-align:right">${now.toLocaleDateString()}</td></tr>
</table>
<p>The refund will be processed to your original payment method within 5-10 business days.</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
<p style="color:#666;font-size:12px;margin-top:24px">This is an automated message from Mirvyn.</p>`,
        },
      });
    } catch (emailErr) {
      console.error("Refund notification email failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Refund processed successfully",
        results: refundResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
