export type PaymentFeeBearer = "customer" | "vendor" | "split_50_50";

export interface PaymentFeeBreakdown {
  productAmountKobo: number;
  requiredAmountKobo: number;
  estimatedPaystackFeeKobo: number;
  customerProcessingFeeKobo: number;
  vendorProcessingFeeKobo: number;
  bearer: PaymentFeeBearer;
}

/**
 * Paystack's published local NGN card/USSD/bank-transfer estimate:
 * 1.5% + NGN 100, with the NGN 100 component waived below NGN 2,500
 * and a NGN 2,000 cap. The verified transaction fee is authoritative.
 */
export function estimatePaystackFeeKobo(amountKobo: number): number {
  const amount = Math.max(0, Math.round(amountKobo));
  if (amount === 0) return 0;
  const percentageFee = Math.round(amount * 0.015);
  const fixedFee = amount < 250_000 ? 0 : 10_000;
  return Math.min(200_000, percentageFee + fixedFee);
}

function grossUpCustomerFee(productAmountKobo: number): { total: number; fee: number } {
  let total = Math.max(0, Math.round(productAmountKobo));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const fee = estimatePaystackFeeKobo(total);
    const nextTotal = productAmountKobo + fee;
    if (nextTotal === total) return { total, fee };
    total = nextTotal;
  }
  return { total, fee: estimatePaystackFeeKobo(total) };
}

export function calculatePaymentFeeBreakdown(
  productAmountKobo: number,
  bearer: PaymentFeeBearer,
): PaymentFeeBreakdown {
  const productAmount = Math.max(0, Math.round(productAmountKobo));

  if (bearer === "customer") {
    const grossedUp = grossUpCustomerFee(productAmount);
    return {
      productAmountKobo: productAmount,
      requiredAmountKobo: grossedUp.total,
      estimatedPaystackFeeKobo: grossedUp.fee,
      customerProcessingFeeKobo: grossedUp.fee,
      vendorProcessingFeeKobo: 0,
      bearer,
    };
  }

  if (bearer === "split_50_50") {
    let customerFee = 0;
    let total = productAmount;
    let paystackFee = estimatePaystackFeeKobo(total);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      paystackFee = estimatePaystackFeeKobo(total);
      customerFee = Math.ceil(paystackFee / 2);
      const nextTotal = productAmount + customerFee;
      if (nextTotal === total) break;
      total = nextTotal;
    }
    paystackFee = estimatePaystackFeeKobo(total);
    customerFee = Math.ceil(paystackFee / 2);
    return {
      productAmountKobo: productAmount,
      requiredAmountKobo: productAmount + customerFee,
      estimatedPaystackFeeKobo: paystackFee,
      customerProcessingFeeKobo: customerFee,
      vendorProcessingFeeKobo: Math.max(0, paystackFee - customerFee),
      bearer,
    };
  }

  const paystackFee = estimatePaystackFeeKobo(productAmount);
  return {
    productAmountKobo: productAmount,
    requiredAmountKobo: productAmount,
    estimatedPaystackFeeKobo: paystackFee,
    customerProcessingFeeKobo: 0,
    vendorProcessingFeeKobo: paystackFee,
    bearer: "vendor",
  };
}
