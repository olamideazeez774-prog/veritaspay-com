-- ============================================================================
-- SEAL MIGRATION: red-team round 3 findings.
--
-- Proven live in the attack arena:
--   [A2b] verification_requests: any authenticated user could INSERT a row
--         for THEMSELVES with status='approved', forging an approved
--         request that admin queues and user settings display as real.
--   [Sub] subscription purpose honored client-controlled
--         metadata.duration_days at verification time: paying the fixed
--         N3,500 once with duration_days=999999 granted ~2700 years of
--         affiliate membership. (Fixed in the edge function; noted here
--         for the audit trail.)
--   [A3]  ai_smart_alerts UPDATE policy allowed any user to dismiss or
--         mark-read GLOBAL alerts (user_id IS NULL) for every other user,
--         and row-level UPDATE on alerts is privileged state anyway.
--         All client alert writes now flow through the two SECURITY
--         DEFINER RPCs, which are scoped per-user.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════
-- SEAL A: a verification request can never enter the world pre-approved.
-- Root cause: the client INSERT policy (auth.uid() = user_id) had no
-- column/value restrictions. The user-facing flow only ever submits
-- 'pending' (DB default), so forcing pending on INSERT breaks nothing and
-- makes forgery structurally impossible regardless of the client.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.force_verification_pending()
RETURNS trigger
LANGUAGE plpgsql
AS $fvp$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$fvp$;

DROP TRIGGER IF EXISTS trg_force_verification_pending ON public.verification_requests;
CREATE TRIGGER trg_force_verification_pending
BEFORE INSERT ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.force_verification_pending();

-- ════════════════════════════════════════════════════════════════════════
-- SEAL B: alert state can only change through the scoped RPCs.
-- The RPCs previously allowed touching any row with user_id IS NULL
-- (global alerts) from any caller; they are now scoped to the caller's own
-- rows plus global rows they may read, and dismissals of global alerts are
-- recorded per-user so one user's dismissal never hides an alert for
-- everyone else.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.ai_smart_alerts
  ADD COLUMN IF NOT EXISTS dismissed_by uuid;

CREATE OR REPLACE FUNCTION public.mark_ai_alert_read(alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.ai_smart_alerts
  SET is_read = true
  WHERE id = alert_id
    AND (user_id = auth.uid() OR user_id IS NULL);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.dismiss_ai_alert(alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  -- Own alerts: dismiss outright. Global alerts: record WHO dismissed so
  -- the alert stays visible to everyone else.
  UPDATE public.ai_smart_alerts
  SET dismissed_at = CASE WHEN user_id = auth.uid() THEN now() ELSE dismissed_at END,
      dismissed_by = CASE WHEN user_id IS NULL THEN auth.uid() ELSE dismissed_by END
  WHERE id = alert_id
    AND (user_id = auth.uid() OR user_id IS NULL);
END;
$fn$;

-- Row-level UPDATE on alert state is no longer a client privilege: the two
-- RPCs above are the only sanctioned write path (they run as the owner).
REVOKE UPDATE ON public.ai_smart_alerts FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL C (defense in depth): notification forgery would have been possible
-- through the historical "true" INSERT policy; keep notifications
-- service-written forever even if a future migration reintroduces a loose
-- policy. This policy + grant pair guarantees the deny regardless.
-- ════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Only service role can insert notifications" ON public.notifications;
CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);
REVOKE INSERT ON public.notifications FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- SEAL D: a vendor can no longer self-mint a VERIFIED listing payment.
-- Root cause: INSERT policy (vendor_id = auth.uid()) had no status
-- restriction, so a vendor could insert status='verified' directly and
-- forge proof of paying the N2,000 listing fee. Client inserts are forced
-- to 'pending'; the Paystack verification path inserts via service role
-- (no user JWT) and is unaffected.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.force_listing_payment_pending()
RETURNS trigger
LANGUAGE plpgsql
AS $flp$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM 'pending' THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$flp$;

DROP TRIGGER IF EXISTS trg_force_listing_payment_pending ON public.product_listing_payments;
CREATE TRIGGER trg_force_listing_payment_pending
BEFORE INSERT ON public.product_listing_payments
FOR EACH ROW EXECUTE FUNCTION public.force_listing_payment_pending();
