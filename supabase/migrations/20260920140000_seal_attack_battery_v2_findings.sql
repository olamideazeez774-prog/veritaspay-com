-- ============================================================================
-- SEAL MIGRATION: attack battery v2 findings (root-cause seals, not patches)
--
-- Proven live in the Postgres attack arena:
--   [T2] payout_requests paid -> rejected refunded the wallet AND kept
--        total_withdrawn advanced: the user kept the real payout AND got
--        the money back. Money printed from nothing.
--   [T3] payout_requests rejected -> paid advanced total_withdrawn and was
--        treated as paid with no reservation: payout after refund.
--   [T7] certificates were self-forgeable: any authenticated user could
--        INSERT arbitrary certificates and UPDATE metadata/certificate_hash
--        on rows that are publicly verifiable.
--   [T8] system_logs accepted INSERT from any client (WITH CHECK true):
--        the audit trail could be flooded or poisoned.
--   [T9] profiles UPDATE had no column restrictions: a user could un-ban
--        themselves, clear suspended_until, zero onboarding_balance_due and
--        extend affiliate_membership_expires_at forever (skips the fee).
--
-- Seals below are structural: revokes, column privileges, transition rules
-- and immutability enforced in one authoritative trigger.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 1 + 2: payout state machine (transition rules + money immutability)
-- Root cause: the integrity trigger moved money on ANY status transition.
-- Now: terminal states are frozen, money columns are immutable after
-- creation, paid requires a funded reservation, rejection restores it
-- exactly once. This REPLACES the separate immutability trigger (which was
-- a patch, not a root seal) with one authoritative implementation.
-- ════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_payout_money_immutable ON public.payout_requests;

CREATE OR REPLACE FUNCTION public.enforce_payout_request_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
    NEW.hold_until := COALESCE(NEW.hold_until, now() + interval '12 hours');
    -- State machine entry rule: every payout starts as pending, no exceptions.
    IF NEW.status IS NOT NULL AND NEW.status <> 'pending'::payout_status THEN
      RAISE EXCEPTION 'Payout requests must be created as pending';
    END IF;
    NEW.status := 'pending'::payout_status;
    UPDATE public.wallets SET withdrawable_balance = withdrawable_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
    NEW.funds_reserved := true;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Money columns are immutable after creation (root seal, was patch trigger).
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.fee_amount IS DISTINCT FROM OLD.fee_amount
       OR NEW.net_amount IS DISTINCT FROM OLD.net_amount THEN
      RAISE EXCEPTION 'Payout request money columns are immutable after creation';
    END IF;

    -- Terminal states are frozen forever (seals paid->rejected double credit).
    IF OLD.status IN ('paid', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Payout is finalized and cannot change status';
    END IF;

    -- processing is reachable only from pending.
    IF NEW.status = 'processing'::payout_status AND OLD.status <> 'pending'::payout_status THEN
      RAISE EXCEPTION 'Payout can only move to processing from pending';
    END IF;

    -- rejected: restore reserved funds exactly once (only while not terminal).
    IF NEW.status = 'rejected'::payout_status AND OLD.status IN ('pending', 'processing') THEN
      IF COALESCE(OLD.funds_reserved, false) = true THEN
        UPDATE public.wallets
        SET withdrawable_balance = withdrawable_balance + OLD.amount, updated_at = now()
        WHERE id = OLD.wallet_id;
        NEW.funds_reserved := false;
      END IF;
      RETURN NEW;
    END IF;

    -- paid: only reachable from pending or processing (seals rejected->paid),
    -- requires a funded reservation (seals paying from nothing), advances
    -- total_withdrawn exactly once per payout via the terminal freeze above.
    IF NEW.status = 'paid'::payout_status AND OLD.status IN ('pending', 'processing') THEN
      SELECT id, withdrawable_balance INTO _wallet
      FROM public.wallets WHERE id = OLD.wallet_id FOR UPDATE;
      IF _wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
      IF COALESCE(OLD.funds_reserved, false) <> true THEN
        IF _wallet.withdrawable_balance < OLD.amount THEN
          RAISE EXCEPTION 'Cannot mark payout paid: reservation missing and wallet cannot fund it';
        END IF;
        UPDATE public.wallets
        SET withdrawable_balance = withdrawable_balance - OLD.amount, updated_at = now()
        WHERE id = OLD.wallet_id;
      END IF;
      UPDATE public.wallets
      SET total_withdrawn = total_withdrawn + OLD.amount, updated_at = now()
      WHERE id = OLD.wallet_id;
      NEW.funds_reserved := false;
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_insert ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_insert
BEFORE INSERT ON public.payout_requests FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_update ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_update
BEFORE UPDATE OF status, amount, wallet_id, user_id, fee_amount, net_amount ON public.payout_requests FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();

-- Defense in depth: total_withdrawn is the "money actually sent" counter.
-- Nothing in the system ever legitimately decreases it.
CREATE OR REPLACE FUNCTION public.wallet_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wallet$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.total_withdrawn < OLD.total_withdrawn THEN
      RAISE EXCEPTION 'wallet.total_withdrawn can never decrease';
    END IF;
  END IF;
  RETURN NEW;
END;
$wallet$;

DROP TRIGGER IF EXISTS trg_wallet_money_guard ON public.wallets;
CREATE TRIGGER trg_wallet_money_guard
BEFORE UPDATE ON public.wallets FOR EACH ROW
EXECUTE FUNCTION public.wallet_money_guard();

-- Landmine removal: debit_wallet_for_payout clamps to zero with GREATEST,
-- which silently permits double-spend (the floor pre-empts the CHECK
-- constraint). It has zero callers; drop it so it can never be reintroduced
-- by a future edge function.
DROP FUNCTION IF EXISTS public.debit_wallet_for_payout(uuid, numeric);

-- Deleting a payout request would orphan its reserved funds forever
-- (the reservation lives in the wallet, the proof of it lives in the row).
-- Payout requests are financial records: reject instead of delete.
CREATE OR REPLACE FUNCTION public.payout_no_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $pnd$
BEGIN
  RAISE EXCEPTION 'Payout requests are financial records and cannot be deleted';
END;
$pnd$;

DROP TRIGGER IF EXISTS trg_payout_no_delete ON public.payout_requests;
CREATE TRIGGER trg_payout_no_delete
BEFORE DELETE ON public.payout_requests FOR EACH ROW
EXECUTE FUNCTION public.payout_no_delete();

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 3: certificates can no longer be forged by clients.
-- Root cause: INSERT policy let any user mint rows directly, bypassing the
-- claim_certificate gating, and UPDATE let them rewrite public metadata.
-- The only writer is the SECURITY DEFINER claim_certificate (runs as owner,
-- unaffected by revokes). Public verification SELECT stays open.
-- ════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can claim certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can update own certificates" ON public.certificates;
REVOKE INSERT, UPDATE, DELETE ON public.certificates FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 4: the audit log becomes tamper-proof for clients.
-- Root cause: public INSERT policy (WITH CHECK true) allowed log flooding
-- and poisoning. All legitimate writes flow through write_system_log /
-- notify triggers, which are SECURITY DEFINER (run as owner) and unaffected.
-- ════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Only service role can insert logs" ON public.system_logs;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.system_logs FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 5: profiles get column-level write protection (root seal for T9).
-- Root cause: blanket UPDATE policy allowed rewriting protected columns.
-- Now users can update ONLY their display name and avatar. Protected
-- columns (ban state, suspension, verification, vendor plan/tier,
-- onboarding balance due, affiliate membership expiry) are writable only by
-- admins (own policy) and service role (edge functions).
-- Profile rows are created exclusively by the handle_new_user trigger on
-- auth.users, so client INSERT is revoked entirely.
-- ════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
REVOKE INSERT ON public.profiles FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 5b: the one legitimate admin write path that lived client-side.
-- AdminUsers.tsx previously wrote vendor_tier / is_verified / is_banned /
-- suspended_until over the anon-key connection (column grants above would
-- have broken it). The root-cause replacement is a single SECURITY DEFINER
-- RPC with a hardcoded field allowlist, per-field value validation, an
-- admin-cannot-ban-admin rule, and audit logging inside the transaction.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_update_user_flag(
  _user_id uuid,
  _field text,
  _value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $adminrpc$
DECLARE
  _scalar text;
  _event_type text;
  _description text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF _field NOT IN ('vendor_tier', 'is_verified', 'is_banned', 'suspended_until') THEN
    RAISE EXCEPTION 'Unknown field';
  END IF;

  IF _value IS NULL OR jsonb_typeof(_value) <> 'boolean' AND jsonb_typeof(_value) NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Invalid value';
  END IF;
  _scalar := _value #>> '{}';

  IF _field = 'vendor_tier' THEN
    IF _scalar NOT IN ('normal', 'premium') THEN
      RAISE EXCEPTION 'Invalid vendor tier';
    END IF;
    UPDATE public.profiles SET vendor_tier = _scalar, updated_at = now() WHERE id = _user_id;
    _event_type := 'vendor_tier_updated';
    _description := 'Vendor tier updated to ' || _scalar;
  ELSIF _field = 'is_verified' THEN
    IF _scalar NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'Invalid verification value';
    END IF;
    UPDATE public.profiles SET is_verified = _scalar::boolean, updated_at = now() WHERE id = _user_id;
    _event_type := CASE WHEN _scalar = 'true' THEN 'user_verified' ELSE 'user_unverified' END;
    _description := CASE WHEN _scalar = 'true' THEN 'User verified' ELSE 'User unverified' END;
  ELSIF _field = 'is_banned' THEN
    IF _scalar NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'Invalid ban value';
    END IF;
    IF _scalar = 'true' AND public.has_role(_user_id, 'admin') THEN
      RAISE EXCEPTION 'Admin accounts cannot be banned';
    END IF;
    UPDATE public.profiles SET is_banned = _scalar::boolean, updated_at = now() WHERE id = _user_id;
    _event_type := CASE WHEN _scalar = 'true' THEN 'user_banned' ELSE 'user_unbanned' END;
    _description := CASE WHEN _scalar = 'true' THEN 'User banned' ELSE 'User unbanned' END;
  ELSE -- suspended_until: timestamp or null to clear
    IF _scalar IS NOT NULL THEN
      BEGIN
        PERFORM (_scalar)::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid suspension timestamp';
      END;
    END IF;
    UPDATE public.profiles SET suspended_until = (_scalar)::timestamptz, updated_at = now() WHERE id = _user_id;
    IF _scalar IS NULL THEN
      _event_type := 'user_unsuspended';
      _description := 'Suspension cleared';
    ELSE
      _event_type := 'user_suspended';
      _description := 'User suspended until ' || _scalar;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  PERFORM public.write_system_log(
    _event_type, 'user', _description, auth.uid(), _user_id::text, 'profile'
  );
END;
$adminrpc$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_flag(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_flag(uuid, text, jsonb) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL 6: pin search_path on every remaining unpinned helper used inside
-- RLS policies (recon showed 3). Prevents schema-shadowing against the
-- helpers even if a future grant ever reintroduced public CREATE.
-- ════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.increment_conversion_count(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_owner(uuid, uuid) SET search_path = public;

-- Root seal for stored XSS via vendor-controlled URLs: only http(s) may be
-- stored. NOT VALID so legacy rows never block the migration; every NEW or
-- UPDATED row is enforced regardless of which client writes it.
ALTER TABLE public.products
  ADD CONSTRAINT products_file_url_scheme CHECK (file_url IS NULL OR file_url ~* '^https?://') NOT VALID;
ALTER TABLE public.products
  ADD CONSTRAINT products_external_url_scheme CHECK (external_url IS NULL OR external_url ~* '^https?://') NOT VALID;

-- Defense in depth: even though EXECUTE is already revoked from clients,
-- bind a client-supplied actor id to the JWT identity inside the function
-- so a future grant change can never reintroduce forged-actor log lines.
CREATE OR REPLACE FUNCTION public.write_system_log(
  _event_type text,
  _category text,
  _description text,
  _actor_id uuid DEFAULT NULL,
  _related_id text DEFAULT NULL,
  _related_type text DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _status text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $logfn$
DECLARE
  _jwt_id uuid := auth.uid();
  _actor_email text;
BEGIN
  -- A client caller can never attribute an entry to someone else.
  IF _jwt_id IS NOT NULL THEN
    _actor_id := _jwt_id;
  END IF;

  IF _actor_id IS NOT NULL THEN
    SELECT email INTO _actor_email FROM public.profiles WHERE id = _actor_id;
  END IF;

  INSERT INTO public.system_logs (
    event_type, category, description, actor_id, actor_email,
    related_id, related_type, amount, status, metadata
  ) VALUES (
    _event_type, _category, _description, _actor_id, _actor_email,
    _related_id, _related_type, _amount, _status, _metadata
  );
END;
$logfn$;
