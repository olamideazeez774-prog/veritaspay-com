ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS funds_reserved boolean NOT NULL DEFAULT false;

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
    IF NEW.amount IS NULL OR NEW.amount < 2500 THEN
      RAISE EXCEPTION 'Minimum withdrawal amount is 2500 NGN';
    END IF;

    SELECT id, user_id, withdrawable_balance
    INTO _wallet
    FROM public.wallets
    WHERE id = NEW.wallet_id
    FOR UPDATE;

    IF _wallet.id IS NULL THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF _wallet.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Payout wallet does not belong to this user';
    END IF;

    IF NEW.amount > _wallet.withdrawable_balance THEN
      RAISE EXCEPTION 'Insufficient withdrawable balance';
    END IF;

    SELECT COALESCE(value, '{}'::jsonb)
    INTO _feature_flags
    FROM public.platform_settings
    WHERE key = 'feature_flags'
    LIMIT 1;

    _withdrawal_fees_enabled := COALESCE((_feature_flags -> 'withdrawal_fees' ->> 'enabled')::boolean, true);
    _is_admin_user := public.has_role(NEW.user_id, 'admin'::app_role);

    NEW.fee_amount := CASE
      WHEN _is_admin_user OR NOT _withdrawal_fees_enabled THEN 0
      ELSE public.compute_withdrawal_fee(NEW.amount)
    END;
    NEW.net_amount := GREATEST(0, NEW.amount - NEW.fee_amount);
    NEW.hold_until := COALESCE(NEW.hold_until, now() + interval '12 hours');
    NEW.status := COALESCE(NEW.status, 'pending'::payout_status);

    UPDATE public.wallets
    SET withdrawable_balance = withdrawable_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.wallet_id;

    NEW.funds_reserved := true;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.funds_reserved = true AND NEW.status = 'rejected'::payout_status AND OLD.status IS DISTINCT FROM 'rejected'::payout_status THEN
      UPDATE public.wallets
      SET withdrawable_balance = withdrawable_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.wallet_id;
      NEW.funds_reserved := false;
    END IF;

    IF NEW.status = 'paid'::payout_status AND OLD.status IS DISTINCT FROM 'paid'::payout_status THEN
      UPDATE public.wallets
      SET total_withdrawn = total_withdrawn + OLD.amount,
          updated_at = now()
      WHERE id = OLD.wallet_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_insert ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_insert
BEFORE INSERT ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_update ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_update
BEFORE UPDATE OF status ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();

REVOKE EXECUTE ON FUNCTION public.enforce_payout_request_integrity() FROM PUBLIC, anon, authenticated;