export type PaymentFeeBearer = "vendor" | "vendor_affiliate_split_50_50";

export interface PaymentFeePreview {
  requiredAmount: number;
  estimatedPaystackFee: number;
  customerProcessingFee: number;
  vendorProcessingFee: number;
  affiliateProcessingFee: number;
}

export function estimatePaystackFee(amountNaira: number): number {
  const amountKobo = Math.max(0, Math.round(amountNaira * 100));
  if (amountKobo === 0) return 0;
  const percentageFee = Math.round(amountKobo * 0.015);
  const fixedFee = amountKobo < 250_000 ? 0 : 10_000;
  return Math.min(200_000, percentageFee + fixedFee) / 100;
}

export function previewPaymentFee(amountNaira: number, bearer: PaymentFeeBearer): PaymentFeePreview {
  const productAmount = Math.max(0, amountNaira);
  const fee = estimatePaystackFee(productAmount);
  const affiliateProcessingFee = bearer === "vendor_affiliate_split_50_50" ? Math.floor(fee * 100 / 2) / 100 : 0;
  return {
    requiredAmount: productAmount,
    estimatedPaystackFee: fee,
    customerProcessingFee: 0,
    vendorProcessingFee: Math.max(0, fee - affiliateProcessingFee),
    affiliateProcessingFee,
  };
}
