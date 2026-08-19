import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { calculatePaymentFeeBreakdown, type PaymentFeeBearer } from "../_shared/payment-fees.ts";

const ALLOWED_PURPOSES = new Set([
  "sale",
  "verification",
  "listing_fee",
  "vendor_onboarding",
  "affiliate_membership",
  "premium_upgrade",
  "subscription",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!PAYSTACK_SECRET_KEY) {
      return respond({ error: "Payment gateway not configured" }, 503);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      email,
      productId,
      affiliateCode,
      buyerName,
      callbackUrl,
      couponCode,
      purpose,
      userId,
      amount,
      metadata: clientMetadata = {},
    } = await req.json();

    if (!email) return respond({ error: "Missing email" }, 400);

    const purposeKey = purpose || "sale";
    if (!ALLOWED_PURPOSES.has(purposeKey)) {
      return respond({ error: `Unsupported purpose: ${purposeKey}` }, 400);
    }

    // --------- NON-SALE FLOWS ---------
    if (purposeKey !== "sale") {
      if (!userId || !amount || amount <= 0) {
        return respond({ error: `Missing userId/amount for ${purposeKey}` }, 400);
      }

      const reference = `MV-${purposeKey.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // 1. Persist PENDING payment intent FIRST (source of truth)
      const { error: insertErr } = await supabase.from("pending_payments").insert({
        user_id: userId,
        email,
        purpose: purposeKey,
        reference,
        expected_amount: amount,
        status: "pending",
        metadata: { ...clientMetadata, product_id: productId || null },
      });
      if (insertErr) {
        console.error("pending_payments insert failed", insertErr);
        return respond({ error: "Could not record payment intent" }, 500);
      }

      // 2. Open Paystack checkout
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100),
          reference,
          callback_url: callbackUrl || undefined,
          metadata: { purpose: purposeKey, user_id: userId, product_id: productId || null, ...clientMetadata },
        }),
      });
      const data = await paystackRes.json();
      if (!paystackRes.ok || !data.status) {
        await supabase
          .from("pending_payments")
          .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: data?.message || "init failed" })
          .eq("reference", reference);
        return respond({ error: data?.message || "Init failed" }, 400);
      }

      return respond({
        reference,
        amount,
        purpose: purposeKey,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
      });
    }

    // --------- SALE FLOW ---------
    if (!productId) return respond({ error: "Missing productId" }, 400);

    // Resolve price server-side
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price, vendor_id, status, is_approved, title, payment_processing_fee_bearer")
      .eq("id", productId)
      .eq("status", "active")
      .eq("is_approved", true)
      .maybeSingle();

    if (productError || !product) {
      return respond({ error: "Product not found or unavailable" }, 404);
    }

    let finalPrice = Number(product.price);

    if (couponCode) {
      const { data: coupon } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("code", String(couponCode).toUpperCase().trim())
        .eq("is_active", true)
        .eq("vendor_id", product.vendor_id)
        .maybeSingle();

      if (coupon) {
        const validProduct = !coupon.product_id || coupon.product_id === productId;
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const hasUses = !coupon.max_uses || coupon.current_uses < coupon.max_uses;
        if (validProduct && notExpired && hasUses) {
          if (coupon.discount_percent > 0) {
            finalPrice = Math.max(0, finalPrice - Math.round(finalPrice * (coupon.discount_percent / 100)));
          } else if (coupon.discount_amount > 0) {
            finalPrice = Math.max(0, finalPrice - Number(coupon.discount_amount));
          }
        }
      }
    }

    if (finalPrice <= 0) return respond({ error: "Invalid product price" }, 400);

    const feeBearer: PaymentFeeBearer = product.payment_processing_fee_bearer === "customer" || product.payment_processing_fee_bearer === "split_50_50"
      ? product.payment_processing_fee_bearer
      : "vendor";
    const feeBreakdown = calculatePaymentFeeBreakdown(Math.round(finalPrice * 100), feeBearer);
    const requiredAmount = feeBreakdown.requiredAmountKobo / 100;

    const reference = `MV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Persist pending intent for sales too (uniform audit trail)
    await supabase.from("pending_payments").insert({
      user_id: userId || product.vendor_id, // sales may be guest checkout; still track
      email,
      purpose: "sale",
      reference,
        expected_amount: requiredAmount,
        expected_amount_kobo: feeBreakdown.requiredAmountKobo,
        customer_processing_fee_kobo: feeBreakdown.customerProcessingFeeKobo,
        vendor_processing_fee_kobo: feeBreakdown.vendorProcessingFeeKobo,
        status: "pending",
        metadata: {
          product_id: productId,
          affiliate_code: affiliateCode || null,
          buyer_name: buyerName || null,
          coupon_code: couponCode || null,
          product_amount_kobo: feeBreakdown.productAmountKobo,
          payment_processing_fee_bearer: feeBearer,
          estimated_paystack_fee_kobo: feeBreakdown.estimatedPaystackFeeKobo,
        },
    });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
          email,
          amount: feeBreakdown.requiredAmountKobo,
          reference,
          callback_url: callbackUrl || undefined,
          channels: ["card", "bank", "ussd"],
          bearer: "account",
          metadata: {
            purpose: "sale",
            product_id: productId,
            affiliate_code: affiliateCode || null,
            buyer_name: buyerName || null,
            coupon_code: couponCode || null,
            server_amount: finalPrice,
            required_amount_kobo: feeBreakdown.requiredAmountKobo,
            payment_processing_fee_bearer: feeBearer,
          },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      await supabase
        .from("pending_payments")
        .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: paystackData?.message || "init failed" })
        .eq("reference", reference);
      return respond({ error: paystackData?.message || "Payment initialization failed" }, 400);
    }

    return respond({
      reference,
      amount: requiredAmount,
      product_amount: finalPrice,
      payment_processing_fee_bearer: feeBearer,
      customer_processing_fee: feeBreakdown.customerProcessingFeeKobo / 100,
      estimated_paystack_fee: feeBreakdown.estimatedPaystackFeeKobo / 100,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
    });
  } catch (error) {
    console.error("initialize-payment error:", error);
    return respond({ error: "Internal server error" }, 500);
  }
});
