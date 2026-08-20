import { MIN_WITHDRAWAL_AMOUNT, WITHDRAWAL_FEE_TIERS } from "@/lib/constants";

export function getWithdrawalFee(amount: number): number {
  const normalized = Math.floor(Number(amount) || 0);
  if (normalized < MIN_WITHDRAWAL_AMOUNT) return 0;
  return WITHDRAWAL_FEE_TIERS.find((tier) => normalized >= tier.min && normalized <= tier.max)?.fee ?? 500;
}

export function getWithdrawalNetAmount(amount: number): number {
  const normalized = Math.max(0, Number(amount) || 0);
  return Math.max(0, normalized - getWithdrawalFee(normalized));
}
