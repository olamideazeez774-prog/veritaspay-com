CREATE OR REPLACE FUNCTION public.debit_wallet_for_payout(_wallet_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wallets
  SET withdrawable_balance = GREATEST(0, withdrawable_balance - _amount),
      total_withdrawn = total_withdrawn + _amount,
      updated_at = now()
  WHERE id = _wallet_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_payout_requests_status_hold
  ON public.payout_requests (status, hold_until);

-- Tighten privileges
REVOKE EXECUTE ON FUNCTION public.debit_wallet_for_payout(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_onboarding_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;