import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authFailureResponse,
  forbiddenResponse,
  getAuthenticatedUser,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Admin-only payout state transitions. Wallet bookkeeping (reservations on
// rejection, total_withdrawn on paid) is enforced by the
// enforce_payout_request_integrity trigger, so this function must not touch
// wallet columns itself.

const TERMINAL_STATUSES = new Set(["paid", "rejected"]);
const NON_TERMINAL_STATUSES = new Set(["pending", "processing"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }

  const cors = buildCorsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await getAuthenticatedUser(req, supabase);
    if (!user) return authFailureResponse(cors);

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) return json({ error: "Could not verify role" }, 500);
    if (!adminRole) return forbiddenResponse(cors, "Admin authorization required");

    const { payoutId, status, admin_notes } = (await req.json()) as {
      payoutId?: string;
      status?: string;
      admin_notes?: string | null;
    };

    if (!payoutId || typeof payoutId !== "string") {
      return json({ error: "Missing required field: payoutId" }, 400);
    }
    if (!status || !NON_TERMINAL_STATUSES.has(status) && !TERMINAL_STATUSES.has(status)) {
      return json({ error: "Invalid status" }, 400);
    }

    // Load the current row and refuse transitions that make no sense instead
    // of letting the wallet trigger misinterpret them.
    const { data: payout, error: fetchError } = await supabase
      .from("payout_requests")
      .select("id, status, user_id, amount, net_amount, funds_reserved")
      .eq("id", payoutId)
      .maybeSingle();
    if (fetchError) return json({ error: "Could not load payout request" }, 500);
    if (!payout) return json({ error: "Payout request not found" }, 404);

    if (TERMINAL_STATUSES.has(payout.status)) {
      return json({ error: `Payout is already ${payout.status} and can no longer be changed` }, 409);
    }
    if (status === "processing" && payout.status !== "pending") {
      return json({ error: "Only pending payouts can move to processing" }, 409);
    }
    // Processing payouts are owned by the automated Paystack transfer pipeline;
    // rejecting one manually would desync the transfer reconciliation.
    if (payout.status === "processing" && status === "rejected") {
      return json({ error: "Payout is being processed by Paystack; wait for the transfer result or use the reversal flow" }, 409);
    }

    const updates: Record<string, unknown> = { status };
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status === "rejected") {
      updates.processed_at = new Date().toISOString();
      updates.failure_reason = admin_notes || "Rejected by admin";
    }
    // 'paid' keeps processed_at under the webhook's control: transfer.success
    // is the authoritative moment, not an admin click.

    const { error: updateError } = await supabase
      .from("payout_requests")
      .update(updates)
      .eq("id", payoutId);
    if (updateError) {
      console.error("payout update failed", updateError);
      return json({ error: "Could not update payout request" }, 500);
    }

    return json({ success: true, payoutId, status });
  } catch (error) {
    console.error("admin-update-payout error", error);
    return json({ error: "Internal server error" }, 500);
  }
});
