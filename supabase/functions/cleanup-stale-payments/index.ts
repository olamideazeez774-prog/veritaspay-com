import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authFailureResponse, isTrustedInternalRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-function-secret, x-cron-secret",
};

// Marks any pending_payments older than 30 min as `expired` so they can
// never accidentally activate a feature later. Safe to call on any schedule.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!isTrustedInternalRequest(req)) return authFailureResponse(corsHeaders, "Internal authorization required");
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("expire_stale_pending_payments", { _older_than_minutes: 30 });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-stale-payments error", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});