-- Supabase-lite: only what migrations need to apply on vanilla Postgres.
-- NOT for production use. Idempotent.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$fn$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb)
$fn$;

-- Vanilla-Postgres stand-ins for Supabase-managed extensions/objects.
CREATE SCHEMA IF NOT EXISTS cron;
CREATE OR REPLACE FUNCTION cron.schedule(text, text, text) RETURNS bigint
LANGUAGE plpgsql AS $fn$ BEGIN RETURN 1; END $fn$;
CREATE OR REPLACE FUNCTION cron.unschedule(text) RETURNS boolean
LANGUAGE plpgsql AS $fn$ BEGIN RETURN true; END $fn$;
DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $fn$;
DO $fn$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $fn$;

-- Supabase grants ALL table/sequence privileges to anon+authenticated by
-- default; RLS is the access filter. Replicate that so RLS is what's tested.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
