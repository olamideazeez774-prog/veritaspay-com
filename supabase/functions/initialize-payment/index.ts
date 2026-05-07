import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 503,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { email, productId, affiliateCode, buyerName, callbackUrl, couponCode, purpose, userId, amount } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Non-sale purposes: amount-based init, no product lookup
    if (purpose && purpose !== "sale") {
      if (!userId || !amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Missing userId/amount for purpose: " + purpose }), {
          status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const reference = `MV-${purpose.toUpperCase().slice(0,3)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100),
          reference,
          callback_url: callbackUrl || undefined,
          metadata: { purpose, user_id: userId, product_id: productId || null },
        }),
      });
      const data = await paystackRes.json();
      if (!paystackRes.ok || !data.status) {
        return new Response(JSON.stringify({ error: data.message || "Init failed" }), {
          status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        reference, amount, purpose,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
      }), { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing productId" }), {
        status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // SECURITY: Resolve actual price server-side. NEVER trust client-supplied amount.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price, vendor_id, status, is_approved, title")
      .eq("id", productId)
      .eq("status", "active")
      .eq("is_approved", true)
      .maybeSingle();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Product not found or unavailable" }), {
        status: 404,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let finalPrice = Number(product.price);

    // Apply coupon discount server-side if provided
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

    if (finalPrice <= 0) {
      return new Response(JSON.stringify({ error: "Invalid product price" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Initialize Paystack transaction
    const reference = `MV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(finalPrice * 100), // server-resolved price in kobo
        reference,
        callback_url: callbackUrl || undefined,
        metadata: {
          product_id: productId,
          affiliate_code: affiliateCode || null,
          buyer_name: buyerName || null,
          coupon_code: couponCode || null,
          server_amount: finalPrice,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack error:", paystackData);
      return new Response(JSON.stringify({ error: paystackData.message || "Payment initialization failed" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      reference,
      amount: finalPrice,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
    }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
