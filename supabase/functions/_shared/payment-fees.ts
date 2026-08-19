export type PaymentFeeBearer = "vendor" | "vendor_affiliate_split_50_50";

export interface PaymentFeeBreakdown {
  productAmountKobo: number;
  requiredAmountKobo: number;
  estimatedPaystackFeeKobo: number;
  customerProcessingFeeKobo: number;
  vendorProcessingFeeKobo: number;
  affiliateProcessingFeeKobo: number;
  bearer: PaymentFeeBearer;
}

/**
 * Paystack's published local NGN estimate. The verified transaction fee is
 * authoritative; this estimate is used only to initialize/disclose amount.
 */
export function estimatePaystackFeeKobo(amountKobo: number): number {
  const amount = Math.max(0, Math.round(amountKobo));
  if (amount === 0) return 0;
  const percentageFee = Math.round(amount * 0.015);
  const fixedFee = amount < 250_000 ? 0 : 10_000;
  return Math.min(200_000, percentageFee + fixedFee);
}

export function calculatePaymentFeeBreakdown(
  productAmountKobo: number,
  bearer: PaymentFeeBearer,
): PaymentFeeBreakdown {
  const productAmount = Math.max(0, Math.round(productAmountKobo));
  const paystackFee = estimatePaystackFeeKobo(productAmount);
  const affiliateFee = bearer === "vendor_affiliate_split_50_50" ? Math.floor(paystackFee / 2) : 0;
  return {
    productAmountKobo: productAmount,
    requiredAmountKobo: productAmount,
    estimatedPaystackFeeKobo: paystackFee,
    customerProcessingFeeKobo: 0,
    vendorProcessingFeeKobo: paystackFee - affiliateFee,
    affiliateProcessingFeeKobo: affiliateFee,
    bearer,
  };
}
