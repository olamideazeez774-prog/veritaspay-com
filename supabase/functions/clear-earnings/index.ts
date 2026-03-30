import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      earningsCleared: 0,
      transactionsUpdated: 0,
      errors: [] as string[],
    };

    // Get all pending transactions that need to be cleared
    // A transaction is cleared when its sale's refund_eligible_until date has passed
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select(`
        id,
        wallet_id,
        amount,
        type,
        sale_id,
        sales!inner(refund_eligible_until, status)
      `)
      .eq("earning_state", "pending")
      .lt("sales.refund_eligible_until", new Date().toISOString())
      .eq("sales.status", "completed");

    if (fetchError) {
      throw new Error(`Failed to fetch pending transactions: ${fetchError.message}`);
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No transactions to clear",
          results: { earningsCleared: 0, transactionsUpdated: 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group transactions by wallet for efficient updates
    const walletUpdates: Record<string, { pending: number; cleared: number }> = {};

    for (const transaction of pendingTransactions) {
      try {
        const walletId = transaction.wallet_id;
        const amount = parseFloat(transaction.amount);

        // Aggregate amounts per wallet
        if (!walletUpdates[walletId]) {
          walletUpdates[walletId] = { pending: 0, cleared: 0 };
        }
        walletUpdates[walletId].pending += amount;
        walletUpdates[walletId].cleared += amount;

        // Update individual transaction
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ earning_state: "cleared" })
          .eq("id", transaction.id);

        if (updateError) {
          results.errors.push(`Failed to update transaction ${transaction.id}: ${updateError.message}`);
          continue;
        }

        results.transactionsUpdated++;
      } catch (err) {
        results.errors.push(`Error processing transaction ${transaction.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Update wallet balances
    for (const [walletId, amounts] of Object.entries(walletUpdates)) {
      try {
        // Get current wallet state
        const { data: wallet } = await supabase
          .from("wallets")
          .select("pending_balance, cleared_balance, withdrawable_balance")
          .eq("id", walletId)
          .single();

        if (!wallet) {
          results.errors.push(`Wallet not found: ${walletId}`);
          continue;
        }

        const newPending = Math.max(0, parseFloat(wallet.pending_balance) - amounts.pending);
        const newCleared = parseFloat(wallet.cleared_balance) + amounts.cleared;
        const newWithdrawable = parseFloat(wallet.withdrawable_balance) + amounts.cleared;

        const { error: walletError } = await supabase
          .from("wallets")
          .update({
            pending_balance: newPending,
            cleared_balance: newCleared,
            withdrawable_balance: newWithdrawable,
            updated_at: new Date().toISOString(),
          })
          .eq("id", walletId);

        if (walletError) {
          results.errors.push(`Failed to update wallet ${walletId}: ${walletError.message}`);
          continue;
        }

        results.earningsCleared += amounts.cleared;
      } catch (err) {
        results.errors.push(`Error updating wallet ${walletId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Log the cron job execution
    await supabase.from("system_logs").insert({
      event_type: "cron_job",
      severity: results.errors.length > 0 ? "warning" : "info",
      related_type: "earnings_clearing",
      description: `Earnings clearing job completed: ${results.transactionsUpdated} transactions cleared, ₦${results.earningsCleared} total`,
      metadata: {
        transactions_cleared: results.transactionsUpdated,
        earnings_cleared: results.earningsCleared,
        errors: results.errors,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Earnings clearing job completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in clear-earnings cron job:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
