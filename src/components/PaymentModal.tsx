import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, CheckCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { LISTING_FEE, useCreateListingPayment } from "@/hooks/useListingPayment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: (paymentReference: string) => void;
  vendorId: string;
  productId?: string;
  amount?: number;
  title?: string;
  description?: string;
}

export function PaymentModal({
  open,
  onOpenChange,
  onPaymentComplete,
  vendorId,
  productId,
  amount = LISTING_FEE,
  title = "Product Listing Payment",
  description = "Complete payment to list your product",
}: PaymentModalProps) {
  const [step, setStep] = useState<"details" | "payment" | "verify" | "complete">("details");
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const createPayment = useCreateListingPayment();

  // Load bank details from platform settings
  const { data: bankDetails } = useQuery({
    queryKey: ["payment-bank-details"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "bank_details")
        .maybeSingle();
      return (data?.value as Record<string, string>) || {
        bankName: "Wema Bank",
        accountNumber: "0123456789",
        accountName: "PayThos Ltd",
      };
    },
  });

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankDetails?.accountNumber || "");
    toast.success("Account number copied!");
  };

  const handleProceedToPayment = () => {
    if (!businessName || !businessEmail) {
      toast.error("Please fill in all details");
      return;
    }
    setStep("payment");
  };

  const handleConfirmPayment = () => {
    if (!paymentReference.trim()) {
      toast.error("Please enter your payment reference");
      return;
    }
    setStep("verify");
  };

  const handleSubmitPayment = async () => {
    try {
      await createPayment.mutateAsync({
        vendor_id: vendorId,
        product_id: productId,
        amount,
        payment_reference: paymentReference.trim(),
        business_name: businessName,
        business_email: businessEmail,
      });
      setStep("complete");
      setTimeout(() => {
        onPaymentComplete(paymentReference);
        onOpenChange(false);
        setStep("details");
        setBusinessName("");
        setBusinessEmail("");
        setPaymentReference("");
      }, 2000);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="business@example.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleProceedToPayment} className="w-full">
                Continue to Payment
              </Button>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <p className="text-sm font-medium">Transfer {formatCurrency(amount)} to:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bank</span>
                    <span className="font-medium">{bankDetails?.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{bankDetails?.accountNumber}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyAccount}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="font-medium">{bankDetails?.accountName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <ExternalLink className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-warning">
                  Use your email as payment reference when making the transfer
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference / Transaction ID</Label>
                <Input
                  id="reference"
                  placeholder="Enter your payment reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleConfirmPayment} className="flex-1">
                  I've Made Payment
                </Button>
              </div>
            </motion.div>
          )}

          {step === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="text-center space-y-2">
                <p className="font-medium">Confirm your payment details</p>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(amount)}</p>
                  <p className="text-sm text-muted-foreground mt-2">Reference</p>
                  <p className="font-mono">{paymentReference}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("payment")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  className="flex-1"
                  disabled={createPayment.isPending}
                >
                  {createPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Verification
                </Button>
              </div>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center"
              >
                <CheckCircle className="h-8 w-8 text-success" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-lg">Payment Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment is being verified. Your product will be activated once confirmed.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
