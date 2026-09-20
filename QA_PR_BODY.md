# QA Summary — 2026-09 Full Remediation

> This file consolidates the QA state of the platform after the September 2026
> remediation passes. It replaces the earlier per-PR QA bodies.

## Scope covered

1. **Money-path integrity** — payments, wallets, payouts, refunds, coupons, commissions.
2. **Access control** — role model, RLS, admin authorization, RPC grants.
3. **Public endpoint abuse resistance** — rate limits, webhooks, delivery links.
4. **Browser security** — CSP and security headers, in-app payment popup.
5. **Frontend quality** — Web Interface Guidelines + frontend-design skill audit (accessibility, motion, forms, typography, images, theming).

## Security and financial integrity (final state)

- Every amount is server-owned: canonical purpose amounts in `initialize-payment`;
  sale prices/coupons resolved from the DB at checkout and snapshotted into
  `pending_payments.metadata`, authoritative end-to-end. Callback hints cannot
  override checkout metadata (blocks affiliate/coupon spoofing via leaked references).
- Payments verified server-to-server with exact-kobo matching, atomic claim to
  survive callback/webhook races, auto-refund on mismatch, and a constant-time
  HMAC compare plus 24 h replay window on the webhook.
- The entire purchase happens in-app via the Paystack v2 popup in access-code
  mode (`src/lib/paystackInline.ts`); hosted-page redirect is a fallback only.
  Popup success/cancel events are never trusted as proof of payment.
- Wallet mutations are atomic SQL only (`create_verified_sale`,
  `process_refund_atomic`, payout reservation/immutability triggers). Payout
  money columns are frozen after creation; the update trigger is bound without
  a column list so the guard cannot be bypassed.
- Admin payout state changes go through the `admin-update-payout` edge function
  (admin JWT re-checked server-side, sane-transition validation).
- Refunds: atomic internal reversal + real Paystack refund initiation, uniform
  404s against enumeration, HTML-escaped buyer emails.
- Role model: `user_roles` writes are admin-only via RLS; free vendor
  onboarding goes through the `self_activate_vendor()` SECURITY DEFINER RPC
  with a hard-coded role. Signup metadata cannot grant roles.
- `send-email` is closed to the public (service-role or admin JWT, allowlisted
  senders); `get-delivery` rate-limits and logs access; `track-click` no longer
  duplicates PII-derived hashes into fraud metadata.
- Rate limiting: DB-backed sliding windows on `initialize-payment`
  (12/10 min per IP+purpose) and `paystack-callback` (60/h per IP, 6/h per
  reference), fail-open, auto-pruned daily.
- Browser: strict CSP (Paystack inline/checkout origins only), HSTS preload,
  `frame-ancestors 'none'`, nosniff, referrer + permissions policies.

## Frontend quality (skill audit, 2026-09-20)

- Reduced motion honored globally (`MotionConfig` + CSS media query).
- Skip-to-content link and `main` landmark; icon buttons labeled; form inputs
  carry `name`/`autocomplete`/`inputMode`/`spellCheck` as appropriate.
- Typographic `…` in loading states, `text-wrap: balance` headings,
  `tabular-nums` tables, explicit image dimensions with lazy loading,
  `color-scheme` theming, `touch-action: manipulation`, `overscroll-contain`
  modals, and zero `transition-all` usages.

## Validation

- `npx tsc --noEmit -p tsconfig.app.json` — 0 errors.
- `npm test` — 20/20 across 3 files, including the 12-test money-rule drift
  guard (client/server fee parity, canonical amounts, edge-function auth
  coverage, migration grant integrity).
- `npm run build` — PWA build passes.
- CI: `.github/workflows/ci.yml` runs typecheck + tests + build on every push
  and PR to `main`; latest run green.

## Deployment requirements (block launch, not code defects)

1. Apply migrations `20260920120000_audit_remediation_hardening.sql` and
   `20260920130000_rate_limit_events.sql` (`supabase db push`).
2. Deploy changed/new edge functions (list in
   `PRODUCTION_DEPLOYMENT_GUIDE.md` §2).
3. Set Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
   and Supabase secrets (`PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `SITE_URL`,
   optional `INTERNAL_FUNCTION_SECRET`).
4. Run the post-deploy smoke test (guide §6) — first live validation of the
   popup flow, including mobile Safari and the ad-blocker fallback.
5. Watch the browser console on first visit for any CSP allowlist adjustment.
6. Switch Paystack to live keys and repeat smoke test #1.

## Known accepted residuals (non-exploitable, documented)

- `ai-insights` lets any authenticated user request AI analysis of their own
  data — a token-cost consideration; admin endpoints stay gated.
- Vendor self-purchase is possible but unprofitable (platform keeps the fee).
- Abandoned payment intents are bounded by the cleanup cron.
- No external error monitoring yet — failures are recorded in
  `system_logs`/`fraud_events` but not proactively alerted.
