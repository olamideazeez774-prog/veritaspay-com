const MIN_WITHDRAWAL_AMOUNT = 3500;

const TIERS = [
  { min: 3500, max: 9999, fee: 50 },
  { min: 10000, max: 20000, fee: 100 },
  { min: 20001, max: 50000, fee: 150 },
  { min: 50001, max: 100000, fee: 200 },
  { min: 100001, max: 500000, fee: 300 },
  { min: 500001, max: 1000000, fee: 400 },
  { min: 1000001, max: Number.POSITIVE_INFINITY, fee: 500 },
] as const;

export function getWithdrawalFee(amount: number): number {
  const normalized = Math.floor(Number(amount) || 0);
  if (normalized < MIN_WITHDRAWAL_AMOUNT) return 0;
  return TIERS.find((tier) => normalized >= tier.min && normalized <= tier.max)?.fee ?? 500;
}

export function getWithdrawalNetAmount(amount: number): number {
  const normalized = Math.max(0, Number(amount) || 0);
  return Math.max(0, normalized - getWithdrawalFee(normalized));
}
