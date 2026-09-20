-- ============================================================================
-- ATTACK BATTERY v3 — seal verification for the 20260920150000 migration.
-- Verification-request self-approval, listing-payment self-verification,
-- global-alert dismissal, notification forgery, and alert-RPC identity
-- binding. Edge-function seals (server-owned subscription duration, last-XFF
-- rate-limit identity) are code-level and reviewed separately.
--
-- Convention: [BLOCKED]/[OK] = seal held. VULNERABLE/BROKEN = seal failed.
-- ============================================================================
\set ON_ERROR_STOP off
\set QUIET on

INSERT INTO auth.users (id, email) VALUES
  ('88888888-8888-8888-8888-888888888888', 'pleb@x.com')
ON CONFLICT DO NOTHING;
-- Seed the owner alert up here, as postgres, BEFORE any SET ROLE:
-- ai_smart_alerts intentionally has no client INSERT policy.
INSERT INTO public.ai_smart_alerts (user_id, alert_type, title, description) VALUES
  ('88888888-8888-8888-8888-888888888888', 'trend', 'own alert', 'test');

\set QUIET off
\echo '=== V3 SEAL VERIFICATION (round 3) ==='

-- [V3-1] verification request self-approval: forced to pending on INSERT
SET ROLE authenticated;
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
INSERT INTO public.verification_requests (user_id, status)
VALUES ('88888888-8888-8888-8888-888888888888', 'approved');
SELECT '  [OK] verification request forced to pending: ' || status
FROM public.verification_requests
WHERE user_id = '88888888-8888-8888-8888-888888888888';
ROLLBACK;

-- [V3-1b] a non-owner verification request is still denied outright
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
DO $v3a$ BEGIN
  INSERT INTO public.verification_requests (user_id, status)
  VALUES ('99999999-9999-9999-9999-999999999999', 'pending');
  RAISE EXCEPTION 'VULNERABLE [V3-1b]: impersonated verification request stored';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] impersonated verification request (%)', SQLERRM; END IF;
END $v3a$;
ROLLBACK;

-- [V3-2] vendor self-verifies a listing payment: forced to pending on INSERT
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
INSERT INTO public.product_listing_payments (vendor_id, amount, payment_reference, status)
VALUES ('88888888-8888-8888-8888-888888888888', 2000, 'MV-FAKE-VERIFIED', 'verified');
SELECT '  [OK] listing payment forced to pending: ' || status
FROM public.product_listing_payments
WHERE payment_reference = 'MV-FAKE-VERIFIED';
ROLLBACK;

-- [V3-3] direct alert UPDATE is no longer a client privilege
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
DO $v3b$ BEGIN
  UPDATE public.ai_smart_alerts SET dismissed_at = now() WHERE user_id IS NULL;
  RAISE EXCEPTION 'VULNERABLE [V3-3]: client updated ai_smart_alerts directly';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] direct alert UPDATE (%)', SQLERRM; END IF;
END $v3b$;
ROLLBACK;

-- [V3-4] notification forgery into another user's inbox is denied
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
DO $v3c$ BEGIN
  INSERT INTO public.notifications (user_id, title, body)
  VALUES ('99999999-9999-9999-9999-999999999999', 'phish', 'click me');
  RAISE EXCEPTION 'VULNERABLE [V3-4]: notification forged into victim inbox';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] notification forgery (%)', SQLERRM; END IF;
END $v3c$;
ROLLBACK;

-- [V3-5] scoped alert RPCs still work for the OWNER's rows
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
SELECT public.mark_ai_alert_read(id) FROM public.ai_smart_alerts
WHERE user_id = '88888888-8888-8888-8888-888888888888' LIMIT 1;
SELECT '  [OK] own alert marked read via RPC: is_read=' || is_read::text
FROM public.ai_smart_alerts WHERE user_id = '88888888-8888-8888-8888-888888888888' LIMIT 1;
ROLLBACK;
RESET ROLE;
