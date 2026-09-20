-- Repair for fresh environments: migration 20260503100516 changes the return
-- type of increment_coupon_usage (INTEGER → VOID) but Postgres cannot change a
-- function's return type in place. On the live database the old signature no
-- longer exists, so this is a no-op there; on any fresh deploy it clears the way.
DROP FUNCTION IF EXISTS public.increment_coupon_usage(uuid);
