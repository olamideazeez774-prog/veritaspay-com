-- ============================================================================
-- ATTACK BATTERY v2 — seal verification for the 20260920140000 migration.
-- Proves the payout state machine, certificates, audit log, profile column
-- privileges, and the admin_update_user_flag RPC hold against every attack
-- that found a live hole before the seal, plus legit-path regression tests.
--
-- Convention: [BLOCKED]/[OK] = seal held. VULNERABLE/BROKEN = seal failed.
-- psql superuser SET ROLE + request.jwt.claims simulates Supabase roles.
-- ============================================================================
\set ON_ERROR_STOP off
\set QUIET on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Distinct subjects (do not collide with attack-battery.sql which makes
-- 33333333... an admin): 99999999... = victim, aaaaaaaa... = admin,
-- bbbbbbbb/cccccccc/dddddddd/eeeeeeee = payout flow subjects,
-- 88888888... = plain non-admin.
INSERT INTO auth.users (id, email) VALUES
  ('99999999-9999-9999-9999-999999999999', 'v2-victim@x.com'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v2-admin@x.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'v2-t2@x.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'v2-t3@x.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'v2-t3b@x.com'),
  ('88888888-8888-8888-8888-888888888888', 'pleb@x.com')
ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin')
ON CONFLICT DO NOTHING;
INSERT INTO public.wallets (user_id) VALUES
  ('99999999-9999-9999-9999-999999999999'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd')
ON CONFLICT DO NOTHING;
UPDATE public.wallets SET withdrawable_balance = 20000
WHERE user_id IN ('99999999-9999-9999-9999-999999999999','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd');

CREATE OR REPLACE FUNCTION p_asservice_v2() RETURNS void LANGUAGE sql AS $$ SET ROLE service_role $$;
-- Let the service path really switch into `authenticated` for client-sim tests
-- (otherwise SET ROLE would error and be misread as a blocked attack).
GRANT authenticated TO service_role;

\set QUIET off
\echo '=== V2 SEAL VERIFICATION ==='

-- [12] stored XSS via javascript:/data: URLs. Run as superuser so ONLY the
-- CHECK constraints stand (RLS would block earlier and prove nothing).
DO $v2url$
DECLARE
  v1 uuid := '99999999-9999-9999-9999-999999999999';
BEGIN
  BEGIN
    INSERT INTO public.products (vendor_id, title, price, commission_percent, file_url)
    VALUES (v1, 'XSS Product', 1000, 50, 'javascript:alert(document.cookie)');
    RAISE EXCEPTION 'VULNERABLE [12]: javascript: file_url stored';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] javascript: file_url (%)', SQLERRM; END IF;
  END;
  BEGIN
    INSERT INTO public.products (vendor_id, title, price, commission_percent, external_url)
    VALUES (v1, 'XSS Product', 1000, 50, 'data:text/html,<script>alert(1)</script>');
    RAISE EXCEPTION 'VULNERABLE [12b]: data: external_url stored';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] data: external_url (%)', SQLERRM; END IF;
  END;
  -- https must still be accepted (legit path regression)
  INSERT INTO public.products (vendor_id, title, price, commission_percent, file_url)
  VALUES (v1, 'Legit Product', 1000, 50, 'https://cdn.example.com/file.pdf');
  RAISE NOTICE '  [OK] https file_url still accepted';
END
$v2url$;

SELECT p_asservice_v2();
DO $v2$
DECLARE
  v1 uuid := '99999999-9999-9999-9999-999999999999';
  v2u uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v3u uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v4u uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  w uuid; tw numeric;
BEGIN
  -- [1] amount mutation on a pending payout (service path)
  SELECT id INTO w FROM public.wallets WHERE user_id = v1;
  INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES (v1, w, 5000);
  BEGIN
    UPDATE public.payout_requests SET amount = 15000 WHERE user_id = v1;
    RAISE EXCEPTION 'VULNERABLE [1]: payout amount mutated';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] amount mutation (%)', SQLERRM; END IF;
  END;

  -- [2] paid -> rejected: refunded wallet + kept total_withdrawn (double credit)
  SELECT id INTO w FROM public.wallets WHERE user_id = v2u;
  INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES (v2u, w, 10000);
  UPDATE public.payout_requests SET status = 'paid' WHERE user_id = v2u;
  BEGIN
    UPDATE public.payout_requests SET status = 'rejected' WHERE user_id = v2u;
    RAISE EXCEPTION 'VULNERABLE [2]: paid->rejected double credit';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] paid->rejected (%)', SQLERRM; END IF;
  END;

  -- [3] rejected -> paid: payout without reservation
  SELECT id INTO w FROM public.wallets WHERE user_id = v3u;
  INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES (v3u, w, 10000);
  UPDATE public.payout_requests SET status = 'rejected' WHERE user_id = v3u;
  UPDATE public.wallets SET withdrawable_balance = 0 WHERE id = w;
  BEGIN
    UPDATE public.payout_requests SET status = 'paid' WHERE user_id = v3u;
    RAISE EXCEPTION 'VULNERABLE [3]: rejected->paid from nothing';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] rejected->paid (%)', SQLERRM; END IF;
  END;

  -- [3b] LEGIT path regression: pending -> processing -> paid
  SELECT id INTO w FROM public.wallets WHERE user_id = v4u;
  INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES (v4u, w, 10000);
  UPDATE public.payout_requests SET status = 'processing' WHERE user_id = v4u;
  UPDATE public.payout_requests SET status = 'paid' WHERE user_id = v4u;
  SELECT total_withdrawn INTO tw FROM public.wallets WHERE id = w;
  IF tw = 10000 THEN RAISE NOTICE '  [OK] legit payout flow, total_withdrawn=%', tw;
  ELSE RAISE EXCEPTION 'BROKEN [3b]: legit payout flow, total_withdrawn=%', tw; END IF;

  -- [4] terminal resurrection (paid -> rejected after [3b])
  BEGIN
    UPDATE public.payout_requests SET status = 'rejected' WHERE user_id = v4u;
    RAISE EXCEPTION 'VULNERABLE [4]: terminal resurrection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] terminal resurrection (%)', SQLERRM; END IF;
  END;

  -- [4b] payout DELETE (would orphan reserved funds)
  BEGIN
    DELETE FROM public.payout_requests WHERE user_id = v1;
    RAISE EXCEPTION 'VULNERABLE [4b]: payout row deleted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] payout delete (%)', SQLERRM; END IF;
  END;

  -- [5] certificate forgery as authenticated
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.certificates (user_id, cert_type, rank_name, certificate_hash)
      VALUES (v1, 'rank', 'Diamond', 'FAKE-HASH-123');
    RAISE EXCEPTION 'VULNERABLE [5]: certificate forged';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] certificate forgery (%)', SQLERRM; END IF;
  END;

  -- [6] audit log poisoning as authenticated
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.system_logs (event_type, category, description) VALUES ('x','x','poisoned');
    RAISE EXCEPTION 'VULNERABLE [6]: audit log poisoned';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] audit log poisoning (%)', SQLERRM; END IF;
  END;

  -- [7] profile protected-column tampering as authenticated
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.profiles SET is_banned = false, suspended_until = NULL, onboarding_balance_due = 0, affiliate_membership_expires_at = '2099-01-01' WHERE id = v1;
    RAISE EXCEPTION 'VULNERABLE [7]: protected profile columns rewritten';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] profile tampering (%)', SQLERRM; END IF;
  END;

  -- [8] benign own-name update must still work
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.profiles SET full_name = 'Legit User' WHERE id = v1;
    RAISE NOTICE '  [OK] own-name update still works';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'BROKEN [8]: own-name update blocked (%)', SQLERRM;
  END;

  -- [11] ghost profile insert as authenticated
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO public.profiles (id, email) VALUES (gen_random_uuid(), 'ghost@x.com');
    RAISE EXCEPTION 'VULNERABLE [11]: ghost profile inserted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] ghost profile insert (%)', SQLERRM; END IF;
  END;
END
$v2$;

-- [9][10][10b] admin_update_user_flag RPC: happy path, denial, allowlist.
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','role','authenticated')::text, true);
SELECT public.admin_update_user_flag('99999999-9999-9999-9999-999999999999', 'is_verified', 'true'::jsonb);
SELECT '  [OK] admin RPC applied is_verified=' || is_verified::text
FROM public.profiles WHERE id = '99999999-9999-9999-9999-999999999999';
DO $t10$ BEGIN
  -- Switch the caller to the non-admin before the attempt.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
  PERFORM public.admin_update_user_flag('99999999-9999-9999-9999-999999999999', 'is_verified', 'false'::jsonb);
  RAISE EXCEPTION 'VULNERABLE [10]: non-admin used admin RPC';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] non-admin RPC (%)', SQLERRM; END IF;
END $t10$;
DO $t10b$ BEGIN
  PERFORM public.admin_update_user_flag('99999999-9999-9999-9999-999999999999', 'email', '"hax@x.com"'::jsonb);
  RAISE EXCEPTION 'VULNERABLE [10b]: unknown field accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] unknown field (%)', SQLERRM; END IF;
END $t10b$;
COMMIT;
RESET ROLE;
