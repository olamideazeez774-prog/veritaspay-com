-- ============================================================================
-- Audit remediation hardening (2026-09-20)
-- 1. Restore the service_role EXECUTE grant on create_verified_sale that was
--    dropped by 20260827101010 (REVOKE without re-GRANT). Without this grant
--    every marketplace sale fails in any fresh environment.
-- 2. Add public.self_activate_vendor(): free, SECURITY DEFINER role grant so
--    onboarding no longer depends on a client-side INSERT into user_roles.
-- 3. Re-close the payout-request tamper hole: amount/fee/net/wallet must never
--    change after creation; a mid-flight amount edit would break the
--    total_withdrawn accounting the trigger performs on the paid transition.
-- 4. Schedule the missing clear-earnings cron (PRD requires daily clearing).
-- 5. Tighten user_roles INSERT to block client-side role self-granting.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. service_role grants for the money-path RPCs.
--    Function signatures MUST match the latest definitions (20260827101010).
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_verified_sale(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
  timestamptz, text, text, text, text, bigint, bigint, bigint, bigint, bigint,
  bigint, bigint, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.process_refund_atomic(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Free vendor self-activation (replaces client-side user_roles INSERT).
--    Vendor registration is free (see src/lib/constants.ts: fee = 0); the
--    affiliate path stays payment-gated through initialize-payment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.self_activate_vendor()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'vendor'::app_role)
  ON CONFLICT DO NOTHING;

  -- Idempotent + self-healing: every user gets a wallet at signup via
  -- handle_new_user, but repair it here if it is ever missing.
  INSERT INTO public.wallets (user_id) VALUES (_user_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'vendor', true);
END;
$$;

REVOKE ALL ON FUNCTION public.self_activate_vendor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_activate_vendor() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Payout integrity trigger with immutability guard.
--    Semantics from 20260824000000_immediate_payouts (30-second hold) are
--    preserved; the UPDATE branch now additionally freezes the money columns
--    so a mid-flight amount edit can never desync total_withdrawn.
-- ---------------------------------------------------------------------------
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
    -- 30-second hold so the payout scheduler picks requests up almost immediately.
    NEW.hold_until := COALESCE(NEW.hold_until, now() + interval '30 seconds');
    NEW.status := COALESCE(NEW.status, 'pending'::payout_status);
    UPDATE public.wallets SET withdrawable_balance = withdrawable_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
    NEW.funds_reserved := true;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Immutability guard: money columns may never change after creation.
    -- Without this, an amount edit between the 'processing' and 'paid'
    -- transitions corrupts the total_withdrawn accounting below.
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.fee_amount IS DISTINCT FROM OLD.fee_amount
       OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
       OR NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Payout request money columns are immutable after creation';
    END IF;

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

-- Re-bind the UPDATE trigger without "OF status": with the column list, an
-- edit touching ONLY amount/fee/net/wallet would never fire the guard above.
DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_update ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_update
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payout_request_integrity();

-- ---------------------------------------------------------------------------
-- 4. Schedule the missing clear-earnings cron (PRD: daily at midnight UTC).
--    Calls the SECURITY DEFINER RPC directly, exactly like the existing
--    cleanup-stale-payments-15m schedule (HTTP-from-cron is fragile: the
--    request.headers GUC is not set inside pg_cron).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('clear-earnings-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clear-earnings-daily');

    PERFORM cron.schedule(
      'clear-earnings-daily',
      '0 0 * * *',
      $$select public.clear_eligible_earnings(1000)$$
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Block client-side role self-granting. Free vendor onboarding now goes
--    through public.self_activate_vendor(); every other role grant must be
--    an admin action (service_role bypasses RLS, so no service policy needed).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
