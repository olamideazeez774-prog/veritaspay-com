# Production Deployment Guide

> Status: the codebase is deployment-ready. The steps below are what you must
> run to bring a live Supabase/Vercel project up to date with this code.

## 1. Apply the pending database migrations

Four migrations contain the 2026-09 hardening (grants, vendor self-activation RPC,
payout immutability trigger, clear-earnings cron, role-policy tightening), the
rate-limit backing table, the attack-battery-v2 seals (payout state machine,
certificate/log/profile write protection, vendor-URL scheme constraints), and
the red-team round-3 seals (verification/listing-payment self-approval, alert
forgery, notification hardening):

```bash
supabase db push
```

Or run in the Supabase SQL Editor, in order:
1. `supabase/migrations/20260920120000_audit_remediation_hardening.sql`
2. `supabase/migrations/20260920130000_rate_limit_events.sql`
3. `supabase/migrations/20260920140000_seal_attack_battery_v2_findings.sql`
4. `supabase/migrations/20260920150000_seal_redteam_round3_findings.sql`

What it does:

| Fix | Detail |
|---|---|
| `create_verified_sale` / `process_refund_atomic` grants | Restores `EXECUTE ... TO service_role` that a previous migration REVOKEd without re-granting. **Without this, every marketplace sale fails on any fresh environment.** |
| `self_activate_vendor()` | Free, idempotent vendor onboarding RPC (SECURITY DEFINER, hard-codes the `vendor` role). Replaces the old client-side `user_roles` INSERT that RLS blocked. |
| Payout immutability | `enforce_payout_request_integrity` now freezes `amount`/`fee_amount`/`net_amount`/`wallet_id`/`user_id` after creation, and the UPDATE trigger is re-bound without `OF status` so money-column-only edits can't bypass the guard. |
| Clear-earnings cron | Schedules `clear-earnings-daily` (`0 0 * * *`) calling the SECURITY DEFINER RPC directly — same proven pattern as `cleanup-stale-payments-15m`. No external cron service needed. |
| Role policy tightening | `user_roles` INSERT is admin-only for `authenticated` (service role bypasses RLS, so onboarding via the RPC still works). The legacy "Users can assign own non-admin roles" self-grant policy is explicitly dropped, closing a real revenue leak (free affiliate self-activation). |
| Fresh-deploy repairs | Older migrations contained three universal deploy-blockers, now fixed in place: invalid `ADD TABLE IF NOT EXISTS` syntax (realtime), an illegal column-dropping `CREATE OR REPLACE VIEW` (`public_profiles`), and three indexes on columns that never existed. Repair migrations make colliding policy/function re-definitions idempotent. |

## 2. Deploy the changed edge functions

```bash
supabase functions deploy admin-update-payout      # NEW function
supabase functions deploy initialize-payment       # + per-IP rate limit
supabase functions deploy paystack-callback        # + per-IP/reference rate limit
supabase functions deploy paystack-webhook         # + constant-time signature check, replay window
supabase functions deploy process-sale
supabase functions deploy process-refund
supabase functions deploy send-email
supabase functions deploy get-delivery
supabase functions deploy track-click
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

- **In-app payments:** Paystack v2 popup in access-code mode (`src/lib/paystackInline.ts`) — the user never leaves the site; hosted-page redirect is only a fallback. Popup callbacks are never trusted as proof of payment.
- **Rate limiting:** DB-backed sliding windows on `initialize-payment` (12/10 min per IP+purpose) and `paystack-callback` (60/h per IP, 6/h per reference), fail-open by design; backing table auto-pruned daily.
- **Webhook hardening:** constant-time HMAC signature compare and a 24 h replay window on top of idempotent processing.
- **Browser security headers:** strict CSP (allowing only Paystack inline/checkout origins), HSTS, `frame-ancestors 'none'`, nosniff, referrer and permissions policies (see `vercel.json`).
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

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every push and PR to `main`:

1. `npx tsc --noEmit` — typecheck
2. `npm test` — unit tests **plus the money-rule drift guard**
3. `npm run build` — production PWA build

A red CI run blocks regressions in fee math, canonical amounts, edge auth, or
migration grants from ever reaching `main`.

## 6. Post-deploy smoke test (5 minutes)

1. **Sale:** buy any product in test mode → **Paystack popup opens in-app** →
   verify → sale row created, vendor/affiliate wallets credited, receipt email
   arrives. Close the popup midway → the "checkout closed, payment may still
   complete" banner shows and the page stays usable.
2. **Amount tamper:** replay the callback with a modified coupon/affiliate — must
   be ignored (metadata wins).
3. **Vendor onboarding:** new user selects "Sell" → role activates without error.
4. **Payout:** request payout → reserve → admin approves → `transfer.success`
   webhook marks it paid and `total_withdrawn` advances.
5. **Refund:** vendor refunds an eligible sale from Dashboard → Sales → wallets
   reverse, Paystack refund initiated.
6. **Roles:** attempt `INSERT INTO user_roles` as a normal authenticated user —
   must be rejected by RLS.

## 7. Known accepted residuals (non-exploitable)

- `ai-insights` allows any authenticated user to request AI analysis of their own
  data — a token-cost consideration, not a privilege issue (platform_advisory is
  admin-gated).
- Vendor self-purchase is possible but unprofitable (platform keeps the fee).
- Abandoned payment intents are bounded by the `cleanup-stale-payments-15m` cron.
- Optional dependency cleanup: `gsap` is declared in `package.json` but never
  imported — safe to `npm uninstall`.

## 8. Pre-launch checklist

Full QA state and accepted residuals are consolidated in `QA_PR_BODY.md`.

- [ ] `supabase db push` applied (migrations `20260920120000` + `20260920130000` + `20260920140000` + `20260920150000`)
- [ ] Changed + new edge functions deployed (section 2)
- [ ] `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `SITE_URL` set
- [ ] Optional: `INTERNAL_FUNCTION_SECRET` set
- [ ] `clear-earnings-daily` cron visible in `cron.job`
- [ ] Smoke tests in section 5 pass in Paystack test mode
- [ ] PWA verified on a real mobile device
- [ ] Switch Paystack to live keys, re-run smoke test #1 with ₦1 product
