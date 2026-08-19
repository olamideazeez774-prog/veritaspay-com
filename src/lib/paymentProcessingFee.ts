export type PaymentFeeBearer = "customer" | "vendor" | "split_50_50";

export interface PaymentFeePreview {
  requiredAmount: number;
  estimatedPaystackFee: number;
  customerProcessingFee: number;
  vendorProcessingFee: number;
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
  if (bearer === "customer") {
    let requiredAmount = productAmount;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const next = productAmount + estimatePaystackFee(requiredAmount);
      if (next === requiredAmount) break;
      requiredAmount = next;
    }
    const fee = estimatePaystackFee(requiredAmount);
    return { requiredAmount, estimatedPaystackFee: fee, customerProcessingFee: fee, vendorProcessingFee: 0 };
  }

  if (bearer === "split_50_50") {
    let requiredAmount = productAmount;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const fee = estimatePaystackFee(requiredAmount);
      const next = productAmount + Math.ceil(fee * 100 / 2) / 100;
      if (next === requiredAmount) break;
      requiredAmount = next;
    }
    const fee = estimatePaystackFee(requiredAmount);
    const customerFee = Math.ceil(fee * 100 / 2) / 100;
    return { requiredAmount: productAmount + customerFee, estimatedPaystackFee: fee, customerProcessingFee: customerFee, vendorProcessingFee: Math.max(0, fee - customerFee) };
  }

  return {
    requiredAmount: productAmount,
    estimatedPaystackFee: estimatePaystackFee(productAmount),
    customerProcessingFee: 0,
    vendorProcessingFee: estimatePaystackFee(productAmount),
  };
}
