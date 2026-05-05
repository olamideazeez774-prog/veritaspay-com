CREATE TABLE IF NOT EXISTS public.automation_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  processed_count integer NOT NULL DEFAULT 0,
  amount_processed numeric NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view automation job runs" ON public.automation_job_runs;
CREATE POLICY "Admins can view automation job runs"
ON public.automation_job_runs
FOR SELECT
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_transactions_pending_sale
ON public.transactions (sale_id, wallet_id, created_at)
WHERE earning_state = 'pending';

CREATE INDEX IF NOT EXISTS idx_sales_clearing_lookup
ON public.sales (status, refund_eligible_until, id)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_payout_requests_due
ON public.payout_requests (status, hold_until, created_at)
WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.clear_eligible_earnings(_batch_size integer DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _processed_count integer := 0;
  _amount_processed numeric := 0;
  _result jsonb;
BEGIN
  IF _batch_size IS NULL OR _batch_size < 1 THEN
    _batch_size := 1000;
  END IF;

  WITH eligible AS (
    SELECT t.id
    FROM public.transactions t
    JOIN public.sales s ON s.id = t.sale_id
    WHERE t.earning_state = 'pending'
      AND s.status = 'completed'
      AND COALESCE(s.refund_eligible_until, t.created_at) <= now()
    ORDER BY t.created_at ASC
    LIMIT _batch_size
    FOR UPDATE OF t SKIP LOCKED
  ), cleared AS (
    UPDATE public.transactions t
    SET earning_state = 'cleared'
    FROM eligible e
    WHERE t.id = e.id
    RETURNING t.wallet_id, t.amount
  ), grouped AS (
    SELECT wallet_id, SUM(amount) AS amount
    FROM cleared
    GROUP BY wallet_id
  ), wallet_updates AS (
    UPDATE public.wallets w
    SET pending_balance = GREATEST(0, w.pending_balance - g.amount),
        cleared_balance = w.cleared_balance + g.amount,
        withdrawable_balance = w.withdrawable_balance + g.amount,
        updated_at = now()
    FROM grouped g
    WHERE w.id = g.wallet_id
    RETURNING g.amount
  )
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO _processed_count, _amount_processed
  FROM wallet_updates;

  _result := jsonb_build_object(
    'processed_count', _processed_count,
    'amount_processed', _amount_processed
  );

  INSERT INTO public.automation_job_runs (job_name, status, processed_count, amount_processed, details)
  VALUES ('clear-earnings', 'success', _processed_count, _amount_processed, _result);

  RETURN _result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.automation_job_runs (job_name, status, details)
  VALUES ('clear-earnings', 'failed', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_eligible_earnings(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_eligible_earnings(integer) TO service_role;