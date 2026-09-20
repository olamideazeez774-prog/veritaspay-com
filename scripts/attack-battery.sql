-- ============================================================================
-- ATTACK BATTERY — adversarial tests against the migrated arena schema.
-- Every test asserts DENY where deny is intended, and exact behavior where
-- allow is intended. psql superuser SET ROLE simulates anon/authenticated;
-- request.jwt.claims simulates a verified JWT.
-- ============================================================================
\set ON_ERROR_STOP off
\set QUIET on
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Test subjects -------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'victim@x.com'),
  ('22222222-2222-2222-2222-222222222222', 'attacker@x.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@x.com');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('33333333-3333-3333-3333-333333333333', 'admin');
INSERT INTO public.products (vendor_id, title, price, commission_percent) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Widget', 5000, 50);

-- helpers ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION p_asanon() RETURNS void LANGUAGE sql AS $$ SET ROLE anon $$;
CREATE OR REPLACE FUNCTION p_asuser(u uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN SET ROLE authenticated; PERFORM set_config('request.jwt.claims', json_build_object('sub', u)::text, false); END $$;
CREATE OR REPLACE FUNCTION p_asservice() RETURNS void LANGUAGE sql AS $$ SET ROLE service_role $$;
CREATE OR REPLACE FUNCTION p_asadmin_session(u uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN SET ROLE authenticated; PERFORM set_config('request.jwt.claims', json_build_object('sub', u)::text, false); END $$;

\set QUIET off

-- ============================================================================
-- ATTACK 1: anon tries everything dangerous — every query must fail.
-- ============================================================================
\echo '=== ATTACK 1: anonymous (no JWT) ==='
SELECT p_asanon();
DO $$ BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('22222222-2222-2222-2222-222222222222', 'admin');
    RAISE EXCEPTION 'VULNERABLE: anon inserted a role';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE '  [BLOCKED] anon role insert';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] anon role insert (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    PERFORM public.create_verified_sale(NULL,NULL,NULL,NULL,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,0,0,0,0,0,0,NULL);
    RAISE EXCEPTION 'VULNERABLE: anon called create_verified_sale';
  EXCEPTION WHEN insufficient_privilege OR undefined_function THEN RAISE NOTICE '  [BLOCKED] anon create_verified_sale';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] anon create_verified_sale (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    PERFORM public.self_activate_vendor();
    RAISE EXCEPTION 'VULNERABLE: anon self-activated vendor';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '  [BLOCKED] anon self_activate_vendor';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] anon self_activate_vendor (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    UPDATE public.wallets SET pending_balance = 999999;
    IF NOT FOUND THEN RAISE NOTICE '  [BLOCKED] anon wallet update (0 rows via RLS)'; ELSE RAISE EXCEPTION 'VULNERABLE: anon updated wallets'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '  [BLOCKED] anon wallet update';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] anon wallet update (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    PERFORM public.process_refund_atomic(gen_random_uuid(), 'x');
    RAISE EXCEPTION 'VULNERABLE: anon called process_refund_atomic';
  EXCEPTION WHEN insufficient_privilege OR undefined_function THEN RAISE NOTICE '  [BLOCKED] anon process_refund_atomic';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] anon process_refund_atomic (%)', SQLERRM; END IF;
  END;
END $$;

-- ============================================================================
-- ATTACK 2: authenticated user escalates privilege — all must fail.
-- ============================================================================
\echo '=== ATTACK 2: attacker (auth) escalates to admin/vendor-by-insert ==='
SELECT p_asuser('22222222-2222-2222-2222-222222222222'::uuid);

DO $$ BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('22222222-2222-2222-2222-222222222222', 'admin');
    RAISE EXCEPTION 'VULNERABLE: user self-granted admin';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE '  [BLOCKED] self-grant admin';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] self-grant admin (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('22222222-2222-2222-2222-222222222222', 'vendor');
    RAISE EXCEPTION 'VULNERABLE: user self-granted vendor via INSERT';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE '  [BLOCKED] self-grant vendor via INSERT';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] self-grant vendor via INSERT (%)', SQLERRM; END IF;
  END;
END $$;

-- The ONLY sanctioned path: the RPC. Must succeed and hard-code vendor.
-- (Verification reads run as service_role: user_roles SELECT is self-or-admin
-- by RLS, so the attacker session could not see its own new role row here —
-- the RPC runs as definer and commits independently.)
DO $$ BEGIN
  PERFORM public.self_activate_vendor();
  SET ROLE service_role;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222' AND role = 'vendor') THEN
    RAISE NOTICE '  [OK] self_activate_vendor grants vendor only';
  ELSE RAISE EXCEPTION 'VULNERABLE: RPC did not create vendor role'; END IF;
END $$;
SELECT p_asuser('22222222-2222-2222-2222-222222222222'::uuid);

-- Attacker tries to hijack another user's wallet via the RPC (targeted insert)
DO $$ BEGIN
  BEGIN
    INSERT INTO public.wallets (user_id) VALUES ('11111111-1111-1111-1111-111111111111');
    RAISE EXCEPTION 'VULNERABLE: user created another wallet';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '  [BLOCKED] cross-user wallet insert';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] cross-user wallet insert (%)', SQLERRM; END IF;
  END;
END $$;

-- ============================================================================
-- ATTACK 3: IDOR — attacker reads/writes victim data.
-- ============================================================================
\echo '=== ATTACK 3: IDOR (attacker vs victim rows) ==='
DO $$ BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id = '11111111-1111-1111-1111-111111111111') THEN
      RAISE EXCEPTION 'VULNERABLE: attacker read victim wallet';
    ELSE RAISE NOTICE '  [BLOCKED] victim wallet read (0 rows)'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '  [BLOCKED] victim wallet read (RLS)';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] victim wallet read (%)', SQLERRM; END IF;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.sales LIMIT 1) THEN
      RAISE EXCEPTION 'VULNERABLE: attacker read sales';
    ELSE RAISE NOTICE '  [BLOCKED] sales read (0 rows)'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '  [BLOCKED] sales read (RLS)';
  WHEN OTHERS THEN IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] sales read (%)', SQLERRM; END IF;
  END;
END $$;

-- ============================================================================
-- ATTACK 4: money path integrity as service_role (what edge functions do).
-- ============================================================================
\echo '=== ATTACK 4: payout trigger integrity (service path) ==='
SELECT p_asservice();
DO $$ DECLARE v_wallet uuid; BEGIN
  INSERT INTO public.wallets (user_id) VALUES ('22222222-2222-2222-2222-222222222222') ON CONFLICT DO NOTHING;
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;
  -- Fund the wallet directly (service-level setup)
  UPDATE public.wallets SET withdrawable_balance = 50000 WHERE id = v_wallet;

  BEGIN
    INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES ('22222222-2222-2222-2222-222222222222', v_wallet, 100);
    RAISE EXCEPTION 'VULNERABLE: sub-minimum payout accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] sub-minimum payout (%)', SQLERRM; END IF;
  END;

  INSERT INTO public.payout_requests (user_id, wallet_id, amount) VALUES ('22222222-2222-2222-2222-222222222222', v_wallet, 10000);
  IF (SELECT withdrawable_balance FROM public.wallets WHERE id = v_wallet) = 40000 THEN
    RAISE NOTICE '  [OK] payout reserves funds (50000-10000=40000)';
  ELSE RAISE EXCEPTION 'VULNERABLE: reservation did not debit wallet'; END IF;

  BEGIN
    UPDATE public.payout_requests SET amount = 40000 WHERE amount = 10000;
    RAISE EXCEPTION 'VULNERABLE: payout amount mutated after creation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'VULNERABLE%' THEN RAISE; ELSE RAISE NOTICE '  [BLOCKED] payout amount mutation (%)', SQLERRM; END IF;
  END;

  UPDATE public.payout_requests SET status = 'rejected' WHERE amount = 10000;
  IF (SELECT withdrawable_balance FROM public.wallets WHERE id = v_wallet) = 50000 THEN
    RAISE NOTICE '  [OK] rejection restores reserved funds';
  ELSE RAISE EXCEPTION 'VULNERABLE: rejection did not restore funds'; END IF;

  UPDATE public.payout_requests SET status = 'paid' WHERE amount = 10000;
  IF (SELECT total_withdrawn FROM public.wallets WHERE id = v_wallet) = 10000 THEN
    RAISE NOTICE '  [OK] paid advances total_withdrawn';
  ELSE RAISE EXCEPTION 'VULNERABLE: total_withdrawn wrong'; END IF;
END $$;

-- create_verified_sale idempotency: two calls, one sale, one credit.
\echo '=== ATTACK 5: sale idempotency (double-credit attack) ==='
SELECT p_asservice();
DO $$ DECLARE
  r1 jsonb; r2 jsonb; v_before numeric; v_after numeric; v_vendor uuid := '11111111-1111-1111-1111-111111111111';
  v_pending uuid := '22222222-2222-2222-2222-222222222222';
  v_product uuid; v_ref text := 'MV-TEST-IDEM-1'; v_txn_count integer;
BEGIN
  SELECT id INTO v_product FROM public.products LIMIT 1;
  SELECT COALESCE(pending_balance,0) + COALESCE(cleared_balance,0) INTO v_before FROM public.wallets WHERE user_id = v_vendor;

  SELECT create_verified_sale(
    v_product, v_vendor, NULL, 'buyer@x.com', 5000, 250, 2500, 2250, 50, 5,
    now(), 'tok-idem-1', v_ref, 'paystack', 'vendor', 500000, 500000, 1, 0, 0, 0, 0, 'Widget') INTO r1;
  SELECT create_verified_sale(
    v_product, v_vendor, NULL, 'buyer@x.com', 5000, 250, 2500, 2250, 50, 5,
    now(), 'tok-idem-1', v_ref, 'paystack', 'vendor', 500000, 500000, 1, 0, 0, 0, 0, 'Widget') INTO r2;
  SELECT COALESCE(pending_balance,0) + COALESCE(cleared_balance,0) INTO v_after FROM public.wallets WHERE user_id = v_vendor;

  IF r1->>'sale_id' = r2->>'sale_id' THEN RAISE NOTICE '  [OK] duplicate reference returns same sale'; ELSE RAISE EXCEPTION 'VULNERABLE: duplicate reference created second sale'; END IF;

  -- Third duplicate for good measure.
  SELECT create_verified_sale(
    v_product, v_vendor, NULL, 'buyer@x.com', 5000, 250, 2500, 2250, 50, 5,
    now(), 'tok-idem-1', v_ref, 'paystack', 'vendor', 500000, 500000, 1, 0, 0, 0, 0, 'Widget') INTO r2;
  IF r1->>'sale_id' = r2->>'sale_id' AND r2->>'created' = 'false' THEN
    RAISE NOTICE '  [OK] third duplicate still a pure no-op';
  ELSE RAISE EXCEPTION 'VULNERABLE: third duplicate mutated state'; END IF;

  -- The real invariant: the wallet moved EXACTLY ONCE for this sale.
  SELECT count(*) INTO v_txn_count FROM public.transactions
  WHERE sale_id = (r1->>'sale_id')::uuid AND type = 'sale_vendor';
  IF v_txn_count = 1 THEN RAISE NOTICE '  [OK] exactly one vendor credit for the sale';
  ELSE RAISE EXCEPTION 'VULNERABLE: % vendor credits for one sale', v_txn_count; END IF;
  SELECT count(*) INTO v_txn_count FROM public.transactions
  WHERE sale_id = (r1->>'sale_id')::uuid AND type = 'sale_commission';
  IF v_txn_count = 0 THEN RAISE NOTICE '  [OK] no phantom affiliate commission';
  ELSE RAISE EXCEPTION 'VULNERABLE: affiliate credited with no affiliate'; END IF;
END $$;

\echo '=== BATTERY COMPLETE ==='
