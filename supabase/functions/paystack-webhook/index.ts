import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { verifyAndActivate } from "../_shared/verify-payment.ts";

// Public webhook — Paystack POSTs charge.success / charge.failed events here.
// Always returns 200 quickly; activation is idempotent via pending_payments + verifyAndActivate.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!PAYSTACK_SECRET_KEY) return new Response("not configured", { status: 503 });

    const raw = await req.text();
    const sig = req.headers.get("x-paystack-signature") || "";
    const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
    if (sig !== expected) {
      console.warn("paystack-webhook signature mismatch");
      return new Response("invalid signature", { status: 401 });
    }

    const event = JSON.parse(raw);
    const reference: string | undefined = event?.data?.reference;
    if (!reference) return new Response("ok", { status: 200 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (event.event === "charge.success") {
      const result = await verifyAndActivate(supabase, PAYSTACK_SECRET_KEY, reference);
      if (!result.ok) console.warn("webhook activation failed", reference, result.body);
    } else if (event.event === "charge.failed") {
      await supabase
        .from("pending_payments")
        .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: "charge.failed webhook" })
        .eq("reference", reference)
        .eq("status", "pending");
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("paystack-webhook error", e);
    return new Response("ok", { status: 200 }); // still 200 so Paystack doesn't retry-storm
  }
});
