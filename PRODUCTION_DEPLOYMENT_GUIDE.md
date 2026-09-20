# Production Deployment Guide

> Status: the codebase is deployment-ready. The steps below are what you must
> run to bring a live Supabase/Vercel project up to date with this code.

## 1. Apply the pending database migration

One migration contains all 2026-09 hardening (grants, vendor self-activation RPC,
payout immutability trigger, clear-earnings cron, role-policy tightening):

```bash
supabase db push
```

Or run in the Supabase SQL Editor:
`supabase/migrations/20260920120000_audit_remediation_hardening.sql`

What it does:

| Fix | Detail |
|---|---|
| `create_verified_sale` / `process_refund_atomic` grants | Restores `EXECUTE ... TO service_role` that a previous migration REVOKEd without re-granting. **Without this, every marketplace sale fails on any fresh environment.** |
| `self_activate_vendor()` | Free, idempotent vendor onboarding RPC (SECURITY DEFINER, hard-codes the `vendor` role). Replaces the old client-side `user_roles` INSERT that RLS blocked. |
| Payout immutability | `enforce_payout_request_integrity` now freezes `amount`/`fee_amount`/`net_amount`/`wallet_id`/`user_id` after creation, and the UPDATE trigger is re-bound without `OF status` so money-column-only edits can't bypass the guard. |
| Clear-earnings cron | Schedules `clear-earnings-daily` (`0 0 * * *`) calling the SECURITY DEFINER RPC directly — same proven pattern as `cleanup-stale-payments-15m`. No external cron service needed. |
| Role policy tightening | `user_roles` INSERT is admin-only for `authenticated` (service role bypasses RLS, so onboarding via the RPC still works). |

## 2. Deploy the changed edge functions

```bash
supabase functions deploy admin-update-payout      # NEW function
supabase functions deploy initialize-payment
supabase functions deploy process-sale
supabase functions deploy process-refund
supabase functions deploy send-email
supabase functions deploy get-delivery
supabase functions deploy track-click
supabase functions deploy paystack-callback
supabase functions deploy paystack-webhook
```

`admin-update-payout` is already registered in `supabase/config.toml` (all 16
functions are listed with `verify_jwt = false`; auth is enforced in-function).

## 3. Environment variables

Supabase Dashboard → Edge Functions secrets:

| Secret | Required for |
|---|---|
| `PAYSTACK_SECRET_KEY` | all payment paths |
| `RESEND_API_KEY` | transactional email (`send-email`) |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-provided |
| `SITE_URL` | correct links inside emails |
| `INTERNAL_FUNCTION_SECRET` **or** `CRON_SECRET` | optional but recommended — trusted-internal auth for `clear-earnings`, `fraud-detection`, `process-sale` |

Vercel project env vars (public, safe): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — see
`vercel-env.txt`.

## 4. Security hardening changelog (2026-09)

Money-rule integrity

- Canonical, server-owned amounts for every non-sale purpose (`verification`,
  `listing_fee`, `affiliate_membership`, `premium_upgrade`, `subscription`); the
  client can no longer dictate what it pays.
- `process-sale` computes all splits through `_shared/sale-pricing.ts` and
  reconciles received-vs-checkout amounts; mismatches raise high-severity
  `fraud_events`.
- Checkout-time pending metadata (product, coupon, affiliate, buyer) is
  **authoritative** — callback hints can no longer swap the affiliate (commission
  farming) or inject a different coupon on a paid order.
- Admin payout state changes go through the `admin-update-payout` edge function
  (admin-JWT gated, sane-transition checks) instead of raw client table writes;
  wallet bookkeeping stays in the DB trigger.
- `process-refund` performs the atomic internal reversal **and** the real
  Paystack refund, with uniform 404s to prevent sale enumeration.

Access control & abuse resistance

- Vendor onboarding no longer depends on a client-side role INSERT.
- `send-email` is closed to the public (service-role or admin JWT only, allowlisted
  `from` addresses) — was an open relay.
- `get-delivery` rate-limits successful lookups (30/hour per IP, hashed) and writes
  `delivery_logs` audit rows.
- `track-click` no longer duplicates the PII-derived `ip_hash` into `fraud_events`.
- Receipt/refund emails HTML-escape user-controlled text (titles, buyer names).

Regression protection

- `src/test/driftGuard.test.ts` (runs in `npm test`) fails CI if: client and
  server withdrawal-fee or Paystack-fee math drift; canonical purpose amounts
  drift from client constants; any edge function loses its auth check or config
  entry; an app-called RPC ends on a REVOKE; or the `create_verified_sale`
  service-role grant disappears again.

## 5. Post-deploy smoke test (5 minutes)

1. **Sale:** buy any product in test mode → webhook verifies → sale row created,
   vendor/affiliate wallets credited, receipt email arrives.
2. **Amount tamper:** replay the callback with a modified coupon/affiliate — must
   be ignored (metadata wins).
3. **Vendor onboarding:** new user selects "Sell" → role activates without error.
4. **Payout:** request payout → reserve → admin approves → `transfer.success`
   webhook marks it paid and `total_withdrawn` advances.
5. **Refund:** vendor refunds an eligible sale from Dashboard → Sales → wallets
   reverse, Paystack refund initiated.
6. **Roles:** attempt `INSERT INTO user_roles` as a normal authenticated user —
   must be rejected by RLS.

## 6. Known accepted residuals (non-exploitable)

- `ai-insights` allows any authenticated user to request AI analysis of their own
  data — a token-cost consideration, not a privilege issue (platform_advisory is
  admin-gated).
- Vendor self-purchase is possible but unprofitable (platform keeps the fee).
- Abandoned payment intents are bounded by the `cleanup-stale-payments-15m` cron.
- Optional dependency cleanup: `gsap` is declared in `package.json` but never
  imported — safe to `npm uninstall`.

## 7. Pre-launch checklist

- [ ] `supabase db push` applied (migration `20260920120000`)
- [ ] Changed + new edge functions deployed (section 2)
- [ ] `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `SITE_URL` set
- [ ] Optional: `INTERNAL_FUNCTION_SECRET` set
- [ ] `clear-earnings-daily` cron visible in `cron.job`
- [ ] Smoke tests in section 5 pass in Paystack test mode
- [ ] PWA verified on a real mobile device
- [ ] Switch Paystack to live keys, re-run smoke test #1 with ₦1 product
