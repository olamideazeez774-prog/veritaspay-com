// Shared sale-pricing rules. process-sale and any future sale path MUST use
// these helpers so the discount and split logic can never drift from what
// initialize-payment disclosed to the buyer at checkout time.

export const PLATFORM_FEE_PERCENT = 5;
export const MIN_COMMISSION_PERCENT = 35;
export const MAX_COMMISSION_PERCENT = 90;

export interface SaleCoupon {
  id: string;
  discount_percent: number | null;
  discount_amount: number | null;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number | null;
  product_id: string | null;
}

/** True when the coupon is valid for this product right now. */
export function isCouponApplicable(
  coupon: SaleCoupon,
  productId: string,
  now: Date = new Date(),
): boolean {
  const validProduct = !coupon.product_id || coupon.product_id === productId;
  const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now;
  const hasUsesLeft = coupon.max_uses == null || (coupon.current_uses ?? 0) < coupon.max_uses;
  return validProduct && notExpired && hasUsesLeft;
}

/**
 * Coupon discount in kobo against a product price expressed in kobo.
 * Callers MUST check isCouponApplicable() first — this only does the math.
 * discount_amount is stored in naira; discount_percent is 0-100.
 */
export function couponDiscountKobo(coupon: SaleCoupon, productAmountKobo: number): number {
  if ((coupon.discount_percent ?? 0) > 0) {
    return Math.min(productAmountKobo, Math.round(productAmountKobo * (coupon.discount_percent! / 100)));
  }
  if ((coupon.discount_amount ?? 0) > 0) {
    return Math.min(productAmountKobo, Math.round(coupon.discount_amount! * 100));
  }
  return 0;
}

export interface SaleTotalsInput {
  productAmountKobo: number; // authoritative product price in kobo (from pending metadata)
  discountKobo: number;
  paystackFeeKobo: number; // verified fee from Paystack when available
  commissionPercent: number;
  platformFeePercent?: number;
  feeBearer: string;
  hasAffiliate: boolean;
}

export interface SaleTotals {
  totalAmountNaira: number;
  platformFee: number;
  grossAffiliateCommission: number;
  affiliateCommission: number;
  vendorEarnings: number;
  affiliateProcessingFeeKobo: number;
  vendorProcessingFeeKobo: number;
}

/**
 * Industry-standard split, all rounding in naira to match wallet storage:
 *   platform_fee         = total * platform_fee_percent / 100
 *   affiliate_commission = total * commission_percent / 100  - affiliate fee share
 *   vendor_earnings      = total - platform_fee - gross_affiliate_commission - vendor fee share
 */
export function computeSaleTotals(input: SaleTotalsInput): SaleTotals {
  const platformFeePercent = input.platformFeePercent ?? PLATFORM_FEE_PERCENT;
  const totalAmountNaira = Math.max(0, (input.productAmountKobo - input.discountKobo) / 100);
  const platformFee = Math.round((totalAmountNaira * platformFeePercent) / 100);

  const paystackFeeKobo = Math.max(0, Math.round(input.paystackFeeKobo));
  const affiliateProcessingFeeKobo =
    input.hasAffiliate && input.feeBearer === "vendor_affiliate_split_50_50"
      ? Math.floor(paystackFeeKobo / 2)
      : 0;
  const vendorProcessingFeeKobo = Math.max(0, paystackFeeKobo - affiliateProcessingFeeKobo);

  const grossAffiliateCommission = input.hasAffiliate
    ? Math.round((totalAmountNaira * input.commissionPercent) / 100)
    : 0;
  const affiliateCommission = Math.max(0, grossAffiliateCommission - affiliateProcessingFeeKobo / 100);
  const vendorEarnings = Math.max(
    0,
    totalAmountNaira - platformFee - grossAffiliateCommission - vendorProcessingFeeKobo / 100,
  );

  return {
    totalAmountNaira,
    platformFee,
    grossAffiliateCommission,
    affiliateCommission,
    vendorEarnings,
    affiliateProcessingFeeKobo,
    vendorProcessingFeeKobo,
  };
}

export function clampCommissionPercent(percent: number): number {
  return Math.min(MAX_COMMISSION_PERCENT, Math.max(MIN_COMMISSION_PERCENT, percent));
}

/**
 * Reconciliation guard: the received amount must equal the product amount
 * minus discount, within one Paystack fee. A bigger deviation means the
 * pending row and the checkout terms disagree — refuse to split money.
 */
export function amountWithinFeeTolerance(
  receivedAmountKobo: number,
  productAmountKobo: number,
  discountKobo: number,
  estimatedPaystackFeeKobo: number,
): boolean {
  const expected = productAmountKobo - discountKobo;
  return Math.abs(receivedAmountKobo - expected) <= Math.max(0, estimatedPaystackFeeKobo);
}
