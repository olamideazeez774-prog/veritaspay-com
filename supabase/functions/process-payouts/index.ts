import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resolve a Paystack bank code from a bank name. Falls back to looking up via Paystack API.
async function resolveBankCode(secret: string, bankName: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = await res.json();
    if (!json?.status) return null;
    const norm = bankName.trim().toLowerCase();
    const match = json.data.find((b: { name: string; code: string }) =>
      b.name.toLowerCase() === norm || b.name.toLowerCase().includes(norm) || norm.includes(b.name.toLowerCase())
    );
    return match?.code ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (_req) => {
  const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!PAYSTACK_SECRET) {
    return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 503 });
  }

  // Pull pending payouts whose hold window has elapsed
  const { data: due, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("status", "pending")
    .lte("hold_until", new Date().toISOString())
    .limit(25);

  if (error) {
    console.error("fetch due payouts:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];

  for (const p of due ?? []) {
    try {
      // 1. Resolve bank code
      const bankCode = await resolveBankCode(PAYSTACK_SECRET, p.bank_name ?? "");
      if (!bankCode) {
        await supabase.from("payout_requests").update({
          status: "rejected", failure_reason: "Could not resolve bank code", auto_processed: true,
        }).eq("id", p.id);
        results.push({ id: p.id, ok: false, reason: "bank-code" });
        continue;
      }

      // 2. Create transfer recipient
      const recipRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "nuban",
          name: p.account_name,
          account_number: p.account_number,
          bank_code: bankCode,
          currency: "NGN",
        }),
      });
      const recipJson = await recipRes.json();
      if (!recipJson?.status) {
        await supabase.from("payout_requests").update({
          status: "rejected", failure_reason: recipJson?.message || "Recipient creation failed", auto_processed: true,
        }).eq("id", p.id);
        results.push({ id: p.id, ok: false, reason: "recipient" });
        continue;
      }

      // 3. Mark processing then initiate transfer
      await supabase.from("payout_requests").update({ status: "processing", auto_processed: true }).eq("id", p.id);

      const netKobo = Math.round(Number(p.net_amount) * 100);
      const xferRes = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "balance",
          amount: netKobo,
          recipient: recipJson.data.recipient_code,
          reason: `Mirvyn payout ${p.id}`,
          reference: `MV-PO-${p.id}`,
        }),
      });
      const xferJson = await xferRes.json();

      if (!xferJson?.status) {
        await supabase.from("payout_requests").update({
          status: "rejected", failure_reason: xferJson?.message || "Transfer failed",
        }).eq("id", p.id);
        results.push({ id: p.id, ok: false, reason: xferJson?.message });
        continue;
      }

      // 4. Mark paid + debit wallet
      await supabase.from("payout_requests").update({
        status: "paid",
        transfer_code: xferJson.data?.transfer_code ?? null,
        transfer_status: xferJson.data?.status ?? "queued",
        processed_at: new Date().toISOString(),
      }).eq("id", p.id);

      await supabase.rpc("debit_wallet_for_payout", {
        _wallet_id: p.wallet_id, _amount: Number(p.amount),
      });

      results.push({ id: p.id, ok: true });
    } catch (e) {
      console.error("payout error", p.id, e);
      await supabase.from("payout_requests").update({
        status: "rejected", failure_reason: String((e as Error).message ?? e),
      }).eq("id", p.id);
      results.push({ id: p.id, ok: false, reason: "exception" });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});