
-- Remove the over-permissive policy from previous step
DROP POLICY IF EXISTS "Anyone can view non-sensitive profile fields via view" ON public.profiles;

-- Profiles are now strictly: owner OR admin (existing policy "Users can view own profile" already covers this)
-- Re-grant SELECT to anon/auth on the safe view only
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Ensure underlying profile table allows view's SECURITY INVOKER reads only of safe rows.
-- Add a narrow SELECT policy that allows reading only id/full_name/avatar_url/referral_code
-- via a separate publicly-readable mirror table is overkill; instead allow auth users
-- to SELECT profiles WHERE columns are limited - Postgres lacks per-column RLS, so we
-- restrict via the view + a permissive policy that returns true but we revoke direct
-- SELECT on sensitive columns at the GRANT level.

-- Revoke broad column access from authenticated, then re-grant only safe columns
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, referral_code, created_at) ON public.profiles TO authenticated;

-- Owners and admins still need full access — they go through RLS via authenticated role,
-- but column-grants block sensitive columns. So we need a privileged path: keep service_role full access
-- and allow authenticated to read sensitive columns only when policy matches.
-- Postgres applies column privileges BEFORE RLS, so this is too restrictive for owners.
-- Workaround: grant all columns back, rely solely on RLS — and add a new policy that ONLY
-- matches when reading own row OR is_admin (already exists as "Users can view own profile").

GRANT SELECT ON public.profiles TO authenticated;

-- The existing policy "Users can view own profile" with USING ((id = auth.uid()) OR is_admin())
-- now becomes the ONLY SELECT policy → other users cannot read any profile row directly.
-- Cross-user lookups must use public_profiles view.
