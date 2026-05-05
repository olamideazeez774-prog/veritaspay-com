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

    const { data: results, error: clearError } = await supabase.rpc("clear_eligible_earnings", {
      _batch_size: 1000,
    });

    if (clearError) {
      throw new Error(`Failed to clear eligible earnings: ${clearError.message}`);
    }

    // Log the cron job execution
    await supabase.from("system_logs").insert({
      event_type: "cron_job",
      severity: "info",
      related_type: "earnings_clearing",
      description: `Earnings clearing job completed: ${results?.processed_count ?? 0} wallet groups cleared, ₦${results?.amount_processed ?? 0} total`,
      metadata: results || {},
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
