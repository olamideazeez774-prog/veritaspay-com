import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  saleId: string;
  reason?: string;
  requestedBy: string; // user ID of admin or vendor initiating refund
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { saleId, reason, requestedBy }: RefundRequest = await req.json();

    if (!saleId || !requestedBy) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: saleId and requestedBy" }),
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
      .eq("user_id", requestedBy);

    const isAdmin = requesterRoles?.some(r => r.role === "admin");
    const isVendor = requesterRoles?.some(r => r.role === "vendor") && sale.vendor_id === requestedBy;

    if (!isAdmin && !isVendor) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins or the vendor can process refunds" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start refund process
    const refundResults = {
      saleUpdated: false,
      transactionsReversed: 0,
      walletAdjustments: [] as string[],
      errors: [] as string[],
    };

    // 1. Update sale status to refunded
    const { error: updateSaleError } = await supabase
      .from("sales")
      .update({
        status: "refunded",
        updated_at: now.toISOString(),
      })
      .eq("id", saleId);

    if (updateSaleError) {
      throw new Error(`Failed to update sale status: ${updateSaleError.message}`);
    }

    refundResults.saleUpdated = true;

    // 2. Reverse wallet transactions
    for (const transaction of sale.transactions || []) {
      try {
        // Get current wallet state
        const { data: wallet } = await supabase
          .from("wallets")
          .select("pending_balance, cleared_balance, withdrawable_balance, total_earned")
          .eq("id", transaction.wallet_id)
          .single();

        if (!wallet) {
          refundResults.errors.push(`Wallet not found: ${transaction.wallet_id}`);
          continue;
        }

        const amount = parseFloat(transaction.amount);
        const earningState = transaction.earning_state;

        // Calculate new balances based on earning state
        let newPending = parseFloat(wallet.pending_balance);
        let newCleared = parseFloat(wallet.cleared_balance);
        let newWithdrawable = parseFloat(wallet.withdrawable_balance);
        let newTotalEarned = parseFloat(wallet.total_earned);

        if (earningState === "pending") {
          newPending = Math.max(0, newPending - amount);
        } else if (earningState === "cleared") {
          newCleared = Math.max(0, newCleared - amount);
          newWithdrawable = Math.max(0, newWithdrawable - amount);
        }
        
        newTotalEarned = Math.max(0, newTotalEarned - amount);

        // Update wallet
        const { error: walletError } = await supabase
          .from("wallets")
          .update({
            pending_balance: newPending,
            cleared_balance: newCleared,
            withdrawable_balance: newWithdrawable,
            total_earned: newTotalEarned,
            updated_at: now.toISOString(),
          })
          .eq("id", transaction.wallet_id);

        if (walletError) {
          refundResults.errors.push(`Failed to update wallet ${transaction.wallet_id}: ${walletError.message}`);
          continue;
        }

        // Create reversal transaction record
        const { error: reversalError } = await supabase
          .from("transactions")
          .insert({
            wallet_id: transaction.wallet_id,
            sale_id: saleId,
            amount: -amount,
            type: "refund",
            earning_state: null,
            description: `Refund for ${sale.products?.title || "product"}${reason ? `: ${reason}` : ""}`,
          });

        if (reversalError) {
          refundResults.errors.push(`Failed to create reversal transaction: ${reversalError.message}`);
        }

        refundResults.transactionsReversed++;
        refundResults.walletAdjustments.push(`Wallet ${transaction.wallet_id}: -₦${amount}`);
      } catch (err) {
        refundResults.errors.push(`Error reversing transaction ${transaction.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Log the refund event
    await supabase.from("system_logs").insert({
      event_type: "refund_processed",
      severity: "info",
      user_id: requestedBy,
      related_id: saleId,
      related_type: "sale",
      description: `Refund processed for sale ${saleId}. Reason: ${reason || "Not specified"}`,
      metadata: {
        sale_id: saleId,
        reason,
        requested_by: requestedBy,
        total_amount: sale.total_amount,
        results: refundResults,
      },
    });

    // 4. Send refund notification email to buyer
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: sale.buyer_email,
          subject: `Refund Processed: ${sale.products?.title || "Your Purchase"} — PayThos`,
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
<p style="color:#666;font-size:12px;margin-top:24px">This is an automated message from VeritasPay.</p>`,
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
