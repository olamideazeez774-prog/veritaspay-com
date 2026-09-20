-- Repair for fresh environments: the next migration re-CREATEs policies
-- that already exist from earlier migrations (CREATE POLICY is not
-- idempotent). Dropping them first makes the next step idempotent.
-- The live database is unaffected: IF EXISTS is a no-op there.

DROP POLICY IF EXISTS "Buyers can view own purchases by email" ON public.sales;
DROP POLICY IF EXISTS "Admins can view delivery logs" ON public.delivery_logs;
DROP POLICY IF EXISTS "Service role can insert delivery logs" ON public.delivery_logs;
