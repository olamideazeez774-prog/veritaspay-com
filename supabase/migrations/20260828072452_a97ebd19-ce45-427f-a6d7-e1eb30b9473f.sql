select cron.schedule(
  'cleanup-stale-payments-15m',
  '*/15 * * * *',
  $$select public.expire_stale_pending_payments(30)$$
);