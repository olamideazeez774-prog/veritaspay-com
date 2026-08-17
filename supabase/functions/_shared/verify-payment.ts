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

  // Idempotency: already verified
  if (pending.status === "verified") {
    return { ok: true, status: 200, body: { success: true, alreadyVerified: true, purpose: pending.purpose, redirect: redirectFor(pending.purpose) } };
  }

  // 2. Verify with Paystack
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
  });
  const paystackData = await verifyRes.json();
  if (!verifyRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
    await supabase
      .from("pending_payments")
      .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: paystackData?.message || `paystack status ${paystackData.data?.status}` })
      .eq("reference", reference);
    return { ok: false, status: 400, body: { error: paystackData?.message || "Payment not successful" } };
  }

  // 3. Verify amount matches expected
  const amountPaidKobo: number = paystackData.data?.amount || 0;
  const expectedKobo = Math.round(Number(pending.expected_amount) * 100);
  if (Math.abs(amountPaidKobo - expectedKobo) > 100) {
    await supabase.from("fraud_events").insert({
      event_type: "payment_amount_mismatch",
      severity: "high",
      related_id: reference,
      related_type: "pending_payment",
      description: `Expected ${expectedKobo} kobo, paid ${amountPaidKobo} kobo (${pending.purpose})`,
      status: "blocked",
      user_id: pending.user_id,
    });
    await supabase
      .from("pending_payments")
      .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: "amount_mismatch" })
      .eq("reference", reference);
    return { ok: false, status: 400, body: { error: "Payment amount mismatch — feature not activated" } };
  }

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
      // Assign vendor role ONLY now
      const vendorPlan = (metadata.vendor_plan as string) || "standard";
      const onboardingBalance = Number(metadata.onboarding_balance_due || 0);
      const { data: hasRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "vendor")
        .maybeSingle();
      if (!hasRole) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "vendor" });
      }
      await supabase
        .from("profiles")
        .update({ vendor_plan: vendorPlan, onboarding_balance_due: onboardingBalance })
        .eq("id", userId);
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
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
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
            },
          });
        }
      }
    }
  } catch (activationErr) {
    console.error("activation failed", purpose, activationErr);
    await supabase
      .from("pending_payments")
      .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: `activation: ${(activationErr as Error).message}` })
      .eq("reference", reference);
    return { ok: false, status: 500, body: { error: "Activation failed after payment" } };
  }

  // 5. Mark verified
  await supabase
    .from("pending_payments")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("reference", reference);

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
