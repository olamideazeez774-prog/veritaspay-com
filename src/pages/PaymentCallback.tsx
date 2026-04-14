import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowRight, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface CheckoutContext {
  productId: string;
  buyerEmail: string;
  buyerName?: string;
  affiliateCode?: string | null;
  couponCode?: string | null;
  finalPrice: number;
  paymentReference: string;
  timestamp: number;
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment...");
  const [saleId, setSaleId] = useState<string | null>(null);

  // Get reference from URL (Paystack sends 'reference' or 'trxref')
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check for checkout context in sessionStorage
        const contextJson = sessionStorage.getItem("checkout_context");
        if (!contextJson) {
          setStatus("error");
          setMessage("Checkout session expired. Please start your purchase again.");
          return;
        }

        const context: CheckoutContext = JSON.parse(contextJson);

        // Verify the reference matches
        if (reference && reference !== context.paymentReference) {
          logger.error("Payment reference mismatch", { received: reference, expected: context.paymentReference });
        }

        // Check if context is too old (30 minutes expiry)
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - context.timestamp > thirtyMinutes) {
          setStatus("error");
          setMessage("Checkout session expired. Please start your purchase again.");
          sessionStorage.removeItem("checkout_context");
          return;
        }

        // Call the paystack-callback edge function to verify and process
        const { data, error } = await supabase.functions.invoke("paystack-callback", {
          body: {
            reference: context.paymentReference,
            productId: context.productId,
            buyerEmail: context.buyerEmail,
            buyerName: context.buyerName,
            affiliateCode: context.affiliateCode,
            couponCode: context.couponCode,
            finalPrice: context.finalPrice,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        // Success!
        setStatus("success");
        setMessage("Your payment was successful!");
        setSaleId(data?.saleId);

        // Clear checkout context
        sessionStorage.removeItem("checkout_context");

        // Store sale ID for the success page
        if (data?.saleId) {
          sessionStorage.setItem("last_sale_id", data.saleId);
        }

        toast.success("Payment successful!");

        // Redirect to success page after a short delay
        setTimeout(() => {
          navigate("/checkout/success");
        }, 2000);

      } catch (err: unknown) {
        logger.error("Payment callback error", err);
        setStatus("error");
        const errorMessage = err instanceof Error ? err.message : "Payment verification failed";
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    processCallback();
  }, [reference, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 max-w-md"
        >
          <div className="glass-card p-8 text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <LoadingSpinner size="lg" />
                </div>
                <h1 className="text-xl font-semibold">Processing Payment</h1>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-xs text-muted-foreground">
                  Please do not close this window...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </div>
                <h1 className="text-xl font-semibold">Payment Successful!</h1>
                <p className="text-muted-foreground">{message}</p>
                {saleId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Reference: {saleId}
                  </p>
                )}
                <Button asChild className="w-full">
                  <Link to="/checkout/success">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <h1 className="text-xl font-semibold">Payment Failed</h1>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/marketplace">Browse Products</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
