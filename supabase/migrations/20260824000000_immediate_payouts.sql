-- Change payout request hold time from 12 hours to 30 seconds for near-immediate processing.
CREATE OR REPLACE FUNCTION public.enforce_payout_request_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet record;
  _feature_flags jsonb := '{}'::jsonb;
  _withdrawal_fees_enabled boolean := true;
  _is_admin_user boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.amount IS NULL OR NEW.amount < 3500 THEN
      RAISE EXCEPTION 'Minimum withdrawal amount is 3500 NGN';
    END IF;
    SELECT id, user_id, withdrawable_balance INTO _wallet
    FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF _wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
    IF _wallet.user_id IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Payout wallet does not belong to this user'; END IF;
    IF NEW.amount > _wallet.withdrawable_balance THEN RAISE EXCEPTION 'Insufficient withdrawable balance'; END IF;
    SELECT COALESCE(value, '{}'::jsonb) INTO _feature_flags
    FROM public.platform_settings WHERE key = 'feature_flags' LIMIT 1;
    _withdrawal_fees_enabled := COALESCE((_feature_flags -> 'withdrawal_fees' ->> 'enabled')::boolean, true);
    _is_admin_user := public.has_role(NEW.user_id, 'admin'::app_role);
    NEW.fee_amount := CASE WHEN _is_admin_user OR NOT _withdrawal_fees_enabled THEN 0 ELSE public.compute_withdrawal_fee(NEW.amount) END;
    NEW.net_amount := GREATEST(0, NEW.amount - NEW.fee_amount);
    
    -- Changed from 12 hours to 30 seconds to allow the cron scheduler to pick it up almost immediately
    NEW.hold_until := COALESCE(NEW.hold_until, now() + interval '30 seconds');
    NEW.status := COALESCE(NEW.status, 'pending'::payout_status);
    
    UPDATE public.wallets SET withdrawable_balance = withdrawable_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
    NEW.funds_reserved := true;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.funds_reserved = true AND NEW.status = 'rejected'::payout_status AND OLD.status IS DISTINCT FROM 'rejected'::payout_status THEN
      UPDATE public.wallets SET withdrawable_balance = withdrawable_balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
      NEW.funds_reserved := false;
    END IF;
    IF NEW.status = 'paid'::payout_status AND OLD.status IS DISTINCT FROM 'paid'::payout_status THEN
      UPDATE public.wallets SET total_withdrawn = total_withdrawn + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;
