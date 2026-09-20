-- Repair for fresh environments: the next migration re-CREATEs policies
-- that already exist from earlier migrations (CREATE POLICY is not
-- idempotent). Dropping them first makes the next step idempotent.
-- The live database is unaffected: IF EXISTS is a no-op there.

DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Admins can view all onboarding" ON public.onboarding_progress;
