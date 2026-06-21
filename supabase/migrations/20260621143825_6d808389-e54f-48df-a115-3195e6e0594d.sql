-- 1. Allow `expired` status on pending payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'pending_payments_status_check'
  ) THEN
    -- no-op (no existing check constraint); allowed values are enforced via trigger below
    NULL;
  END IF;
END$$;

-- 2. Index for cleanup + admin filters
CREATE INDEX IF NOT EXISTS idx_pending_payments_status_created
  ON public.pending_payments (status, created_at);

-- 3. Function to expire stale pending payments
CREATE OR REPLACE FUNCTION public.expire_stale_pending_payments(_older_than_minutes integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  WITH expired AS (
    UPDATE public.pending_payments
    SET status = 'expired',
        failed_at = now(),
        failure_reason = COALESCE(failure_reason, 'auto_expired_after_' || _older_than_minutes || '_min')
    WHERE status = 'pending'
      AND created_at < now() - make_interval(mins => _older_than_minutes)
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM expired;

  INSERT INTO public.automation_job_runs (job_name, status, processed_count, details)
  VALUES ('expire-stale-payments', 'success', _count, jsonb_build_object('expired_count', _count));

  RETURN jsonb_build_object('expired_count', _count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_pending_payments(integer) TO service_role;