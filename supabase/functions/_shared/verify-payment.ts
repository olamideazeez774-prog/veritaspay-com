// Shared verification + activation used by paystack-callback and paystack-webhook.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface VerifyResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function verifyAndActivate(
  supabase: SupabaseClient,
  paystackSecret: string,
  reference: string,
  saleContext?: {
    productId?: string;
    buyerEmail?: string;
    buyerName?: string;
    affiliateCode?: string | null;
    couponCode?: string | null;
  },
): Promise<VerifyResult> {
  if (!reference) return { ok: false, status: 400, body: { error: "Missing reference" } };

  // 1. Look up the pending payment record (source of truth)
  const { data: pending, error: pendingErr } = await supabase
    .from("pending_payments")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (pendingErr) return { ok: false, status: 500, body: { error: "Could not load pending payment" } };
  if (!pending) return { ok: false, status: 404, body: { error: "No pending payment for reference" } };

  // Idempotency: verified and amount-mismatch payments are terminal states.
  if (pending.status === "verified") {
    return { ok: true, status: 200, body: { success: true, alreadyVerified: true, purpose: pending.purpose, redirect: redirectFor(pending.purpose) } };
  }
  if (pending.status === "amount_mismatch") {
    return { ok: false, status: 400, body: { error: "Payment amount mismatch — refund is being tracked and no value was delivered", amountMismatch: true, refundStatus: pending.refund_status || "pending" } };
  }

  // Claim the payment before any Paystack verification or activation. This closes
  // the callback/webhook race: only the invocation that changes pending ->
  // processing may perform the activation. A stale claim can be recovered after
  // five minutes so a crashed invocation does not strand a successful payment.
  const nowIso = new Date().toISOString();
  const processingStartedAt = pending.processing_started_at ? new Date(pending.processing_started_at).getTime() : 0;
  const processingIsFresh = pending.status === "processing" && processingStartedAt > Date.now() - 5 * 60 * 1000;
  if (processingIsFresh) {
    return { ok: true, status: 202, body: { success: true, processing: true, reference } };
  }

  const claimQuery = supabase
    .from("pending_payments")
    .update({ status: "processing", processing_started_at: nowIso })
    .eq("reference", reference)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  let { data: claimed, error: claimError } = await claimQuery;

  if (!claimed && pending.status === "processing" && pending.processing_started_at) {
    ({ data: claimed, error: claimError } = await supabase
      .from("pending_payments")
      .update({ status: "processing", processing_started_at: nowIso })
      .eq("reference", reference)
      .eq("status", "processing")
      .eq("processing_started_at", pending.processing_started_at)
      .select("id")
      .maybeSingle());
  }

  if (claimError) {
    console.error("Payment processing claim failed", claimError);
    return { ok: false, status: 500, body: { error: "Could not claim payment for processing" } };
  }
  if (!claimed) {
    return { ok: true, status: 202, body: { success: true, processing: true, reference } };
  }

  // 2. Verify with Paystack
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
  });
  const paystackData = await verifyRes.json();
  if (!verifyRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
    await supabase
      .from("pending_payments")
      .update({ status: "failed", processing_started_at: null, failed_at: new Date().toISOString(), failure_reason: paystackData?.message || `paystack status ${paystackData.data?.status}` })
      .eq("reference", reference)
      .eq("status", "processing");
    return { ok: false, status: 400, body: { error: paystackData?.message || "Payment not successful" } };
  }

  // 3. Verify the exact amount in kobo. Never use a tolerance: a mismatch
  // must not deliver value, credit wallets, or distribute commissions.
  const amountPaidKobo = Number(paystackData.data?.amount || 0);
  const expectedKobo = Number.isFinite(Number(pending.expected_amount_kobo))
    ? Number(pending.expected_amount_kobo)
    : Math.round(Number(pending.expected_amount) * 100);
  const paystackFeeKobo = Number(paystackData.data?.fees || 0);
  const paystackTransactionId = Number(paystackData.data?.id || 0) || null;

  if (amountPaidKobo !== expectedKobo) {
    let refundStatus = "not_initiated";
    let refundReference: string | null = null;
    try {
      const refundRes = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction: reference,
          amount: amountPaidKobo,
          customer_note: "The amount received did not match the required payment amount. Your refund has been submitted to Paystack.",
          merchant_note: `Amount mismatch for ${reference}: expected ${expectedKobo}, received ${amountPaidKobo}`,
        }),
      });
      const refundData = await refundRes.json();
      refundStatus = refundData?.data?.status || (refundRes.ok && refundData?.status ? "pending" : "failed");
      refundReference = refundData?.data?.id ? String(refundData.data.id) : null;
    } catch (refundError) {
      console.error("Amount-mismatch refund initiation failed", refundError);
      refundStatus = "initiation_failed";
    }

    await supabase.from("fraud_events").insert({
      event_type: "payment_amount_mismatch",
      severity: "high",
      related_id: reference,
      related_type: "pending_payment",
      description: `Expected ${expectedKobo} kobo, paid ${amountPaidKobo} kobo (${pending.purpose})`,
      status: "blocked",
      user_id: pending.user_id,
      metadata: { expected_amount_kobo: expectedKobo, received_amount_kobo: amountPaidKobo, refund_status: refundStatus, refund_reference: refundReference },
    });

    await supabase.from("pending_payments").update({
      status: "amount_mismatch",
      processing_started_at: null,
      failed_at: new Date().toISOString(),
      failure_reason: "amount_mismatch",
      mismatch_reason: `Expected ${expectedKobo} kobo; received ${amountPaidKobo} kobo`,
      received_amount_kobo: amountPaidKobo,
      paystack_transaction_id: paystackTransactionId,
      paystack_fee_kobo: paystackFeeKobo,
      refund_amount_kobo: amountPaidKobo,
      refund_reference: refundReference,
      refund_status: refundStatus,
    }).eq("reference", reference).eq("status", "processing");

    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: pending.email,
          subject: "Payment amount mismatch — Mirvyn",
          html: `<p>We received ₦${(amountPaidKobo / 100).toLocaleString()} for a payment that required ₦${(expectedKobo / 100).toLocaleString()}.</p><p>Your product was not delivered and no commissions were credited. A refund request has been submitted to Paystack with status <strong>${refundStatus}</strong>. Processing time depends on Paystack and your payment method.</p><p>Payment reference: ${reference}</p>`,
        },
      });
    } catch (notificationError) {
      console.error("Amount-mismatch notification failed", notificationError);
    }

    return {
      ok: false,
      status: 400,
      body: {
        error: "Payment amount mismatch — product delivery and earnings were blocked",
        amountMismatch: true,
        expectedAmount: expectedKobo / 100,
        receivedAmount: amountPaidKobo / 100,
        refundStatus,
        refundReference,
      },
    };
  }

  await supabase.from("pending_payments").update({
    received_amount_kobo: amountPaidKobo,
    paystack_transaction_id: paystackTransactionId,
    paystack_fee_kobo: paystackFeeKobo,
  }).eq("reference", reference).eq("status", "processing");

  // 4. Activate based on purpose
  const userId = pending.user_id;
  const metadata = (pending.metadata || {}) as Record<string, unknown>;
  const purpose = pending.purpose;

  try {
    if (purpose === "verification") {
      // Insert request only after payment confirmed
      const { data: existing } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("payment_reference", reference)
        .maybeSingle();
      if (!existing) {
        await supabase.from("verification_requests").insert({
          user_id: userId,
          path: "paid",
          status: "pending",
          payment_reference: reference,
        });
      }
    } else if (purpose === "listing_fee") {
      const productId = (metadata.product_id as string) || saleContext?.productId;
      await supabase.from("product_listing_payments").insert({
        vendor_id: userId,
        product_id: productId || null,
        amount: amountPaidKobo / 100,
        payment_reference: reference,
        payment_gateway: "paystack",
        status: "verified",
      });
      // Bump product from draft to pending review (admin still must approve)
      if (productId) {
        await supabase
          .from("products")
          .update({ status: "pending_review" })
          .eq("id", productId)
          .eq("vendor_id", userId)
          .eq("status", "draft");
      }
    } else if (purpose === "vendor_onboarding") {
      // Vendor registration is free and is activated directly during onboarding.
      return { ok: false, status: 400, body: { error: "Vendor registration is free; no vendor onboarding payment is required" } };
    } else if (purpose === "affiliate_membership") {
      const { data: hasRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "affiliate")
        .maybeSingle();
      if (!hasRole) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "affiliate" });
      }
      const expiresAtDate = new Date();
      expiresAtDate.setMonth(expiresAtDate.getMonth() + 1);
      const expiresAt = expiresAtDate.toISOString();
      await supabase.from("profiles").update({ affiliate_membership_expires_at: expiresAt }).eq("id", userId);
    } else if (purpose === "premium_upgrade") {
      await supabase.from("profiles").update({ vendor_tier: "premium" }).eq("id", userId);
    } else if (purpose === "subscription") {
      // Future: extend a subscription record by metadata.duration_days
      const days = Number(metadata.duration_days || 30);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("profiles")
        .update({ affiliate_membership_expires_at: expiresAt })
        .eq("id", userId);
    } else if (purpose === "sale") {
      // Sales are handled by process-sale; webhook just records verification, callback also calls process-sale
      const productId = (metadata.product_id as string) || saleContext?.productId;
      const buyerEmail = saleContext?.buyerEmail || pending.email;
      if (productId && buyerEmail) {
        const { data: existingSale } = await supabase
          .from("sales")
          .select("id")
          .eq("payment_reference", reference)
          .maybeSingle();
        if (!existingSale) {
          await supabase.functions.invoke("process-sale", {
            body: {
              productId,
              buyerEmail,
              buyerName: saleContext?.buyerName || (metadata.buyer_name as string) || null,
              affiliateCode: saleContext?.affiliateCode || (metadata.affiliate_code as string) || null,
              couponCode: saleContext?.couponCode || (metadata.coupon_code as string) || null,
              paymentReference: reference,
              paymentGateway: "paystack",
              requiredAmountKobo: expectedKobo,
              receivedAmountKobo: amountPaidKobo,
              paystackFeeKobo,
              paystackTransactionId,
              affiliateProcessingFeeKobo: Number(pending.affiliate_processing_fee_kobo || metadata.affiliate_processing_fee_kobo || 0),
            },
          });
        }
      }
    }
  } catch (activationErr) {
    console.error("activation failed", purpose, activationErr);
    await supabase
      .from("pending_payments")
      .update({ status: "failed", processing_started_at: null, failed_at: new Date().toISOString(), failure_reason: `activation: ${(activationErr as Error).message}` })
      .eq("reference", reference)
      .eq("status", "processing");
    return { ok: false, status: 500, body: { error: "Activation failed after payment" } };
  }

  // 5. Mark verified
  await supabase
    .from("pending_payments")
    .update({ status: "verified", processing_started_at: null, verified_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "processing");

  return {
    ok: true,
    status: 200,
    body: { success: true, purpose, redirect: redirectFor(purpose) },
  };
}

function redirectFor(purpose: string): string {
  switch (purpose) {
    case "verification": return "/dashboard/settings";
    case "listing_fee": return "/dashboard/products";
    case "vendor_onboarding": return "/dashboard";
    case "affiliate_membership": return "/dashboard";
    case "premium_upgrade": return "/dashboard/settings";
    case "subscription": return "/dashboard";
    case "sale": return "/checkout/success";
    default: return "/dashboard";
  }
}
