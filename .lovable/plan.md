# Finish the remaining backend deployments

The database work from the approved plan is already live (referral/second-tier removal, payout hold, product status enum, delivery columns), and the code fixes for the delivery function and sale processing are in place. What's left is pushing the functions live, scheduling the last background job, and verifying.

## 1. Deploy every edge function

Deploy all 15 functions so the live copies match the repo — most importantly the ones changed by the referral removal and delivery fix:

- process-sale, get-delivery, paystack-webhook, paystack-callback, initialize-payment
- clear-earnings, cleanup-stale-payments, process-payouts, process-refund
- ai-insights, ai-autonomous-scheduler, fraud-detection, generate-daily-digest, send-email, track-click

## 2. Schedule the stale-payment cleanup job

Only two cron jobs are active: payouts every 30 minutes and earnings clearing daily at 02:00 UTC. Abandoned payment intents never expire because `cleanup-stale-payments` has no schedule. Add a job that runs every 15 minutes.

Since that function requires internal authorization, the cleanest route is a cron job that calls the database routine `expire_stale_pending_payments(30)` directly in SQL — no HTTP call, no shared secret needed. The deployed function stays available for manual runs.

## 3. Missing secrets

Three secrets are still unset and their features stay inert until they're provided:

- `RESEND_API_KEY` — transactional email
- `INTERNAL_FUNCTION_SECRET` / `CRON_SECRET` — internal authorization for cron-triggered function endpoints

`INTERNAL_FUNCTION_SECRET` and `CRON_SECRET` can be generated automatically (no user input). `RESEND_API_KEY` has to come from your Resend account — I'll open a secure prompt for it; the value is never printed back.

## 4. Verify

- Confirm all 15 functions report deployed
- Confirm three cron jobs are active and that a manual run of the cleanup routine expires stale intents
- Smoke-test the delivery function with an invalid token (expect a clean 404, not a column error)
- Run the database linter and report anything new
- Typecheck and build clean, then check the build log

## Technical notes

- The cron entry is added via a migration using `cron.schedule('cleanup-stale-payments-15m', '*/15 * * * *', $$select public.expire_stale_pending_payments(30)$$)`, matching the existing job pattern.
- The security linter previously reported 72 warnings, mostly `SECURITY DEFINER` functions executable by `anon`/`authenticated`. Tightening those grants is a separate hardening pass — say the word and I'll fold it into this run, otherwise I'll report the findings without changing grants so nothing breaks mid-deploy.
