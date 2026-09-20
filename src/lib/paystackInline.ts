/**
 * Paystack Popup (InlineJS v2) — keeps the entire payment inside the app.
 *
 * SECURITY MODEL (the only correct one):
 *  - initialize-payment runs server-side and returns an ACCESS CODE; the amount,
 *    email, and metadata are locked on Paystack's side and cannot be tampered
 *    with from the browser (docs: "checkout() with an access code — recommended").
 *  - onSuccess/onClose are browser events and are NEVER trusted as proof of
 *    payment. Value is granted only after the server re-verifies the
 *    transaction with Paystack (paystack-callback → exact-kobo check).
 *
 * Falls back to the hosted-page redirect only when the popup library cannot
 * load (aggressive ad-blockers); callers decide via the thrown error.
 */

const INLINE_SRC = "https://js.paystack.co/v2/inline.js";
let loaderPromise: Promise<void> | null = null;

export function loadPaystackInline(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as { PaystackPop?: unknown };
    if (typeof w.PaystackPop !== "undefined") return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${INLINE_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      if (typeof (window as unknown as { PaystackPop?: unknown }).PaystackPop === "undefined") {
        reject(new Error("Paystack checkout loaded but is unavailable"));
        return;
      }
      resolve();
    };
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load the secure checkout (check blockers)")),
      { once: true },
    );
    if (!existing) {
      script.src = INLINE_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (typeof w.PaystackPop !== "undefined") {
      resolve();
    }
  });
  return loaderPromise;
}

export interface PaystackCheckoutTransaction {
  reference?: string;
  status?: string;
  trans?: string;
  trxref?: string;
}

export interface CheckoutCallbacks {
  accessCode: string;
  /** Payment completed in the popup. ALWAYS re-verify on the server afterwards. */
  onSuccess: (transaction: PaystackCheckoutTransaction) => void;
  /** Popup closed. Does NOT mean payment failed — the webhook may still land. */
  onClose: () => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/** Opens the access-code popup (amount/email/metadata are server-locked). */
export async function openPaystackCheckout(callbacks: CheckoutCallbacks): Promise<void> {
  await loadPaystackInline();
  const w = window as unknown as {
    PaystackPop?: new () => {
      checkout: (options: {
        accessCode: string;
        onSuccess: (t: PaystackCheckoutTransaction) => void;
        onClose: () => void;
        onLoad?: () => void;
        onError?: (e: Error) => void;
      }) => void;
    };
  };
  if (typeof w.PaystackPop === "undefined") {
    throw new Error("Secure checkout is unavailable right now");
  }
  try {
    const popup = new w.PaystackPop();
    popup.checkout({
      accessCode: callbacks.accessCode,
      onSuccess: callbacks.onSuccess,
      onClose: callbacks.onClose,
      ...(callbacks.onLoad ? { onLoad: callbacks.onLoad } : {}),
      ...(callbacks.onError ? { onError: callbacks.onError } : {}),
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error("Could not open secure checkout");
  }
}

/**
 * Verify a payment through the server (never trust popup callbacks alone).
 * Returns the server's verification result; throws on rejection.
 */
export async function verifyPayment(reference: string): Promise<Record<string, unknown>> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("paystack-callback", {
    body: { reference },
  });
  if (error) throw error instanceof Error ? error : new Error("Verification request failed");
  if (data?.error) throw new Error(String(data.error));
  return (data ?? {}) as Record<string, unknown>;
}
