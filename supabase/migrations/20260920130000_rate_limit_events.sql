-- Rate limiting backing table for edge functions (sliding-window counters).
-- Written only by service-role edge functions; RLS denies everyone else.
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_bucket_time
  ON public.rate_limit_events (bucket_key, created_at);

-- Deny all client access; service_role bypasses RLS.
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_events FROM PUBLIC, anon, authenticated;

-- Housekeeping: never let the table grow unbounded (7 days of history is ample
-- for window lookups of up to 1 hour).
CREATE OR REPLACE FUNCTION public.prune_rate_limit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '7 days';
$$;

REVOKE ALL ON FUNCTION public.prune_rate_limit_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_rate_limit_events() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-rate-limit-events-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-rate-limit-events-daily');
    PERFORM cron.schedule(
      'prune-rate-limit-events-daily',
      '15 0 * * *',
      $$select public.prune_rate_limit_events()$$
    );
  END IF;
END
$$;
