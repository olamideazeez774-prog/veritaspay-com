-- Repair for fresh environments: migration 20260415000000 redefines
-- increment_conversion_count with a renamed parameter (link_id → _link_id).
-- Postgres cannot change a function's input-parameter name in place, so the
-- old definition must be dropped first. A no-op on the live database.
DROP FUNCTION IF EXISTS public.increment_conversion_count(uuid);
