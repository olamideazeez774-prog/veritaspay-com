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
- `npm test` — 20/20 across 3 files, including the 12-test money-rule driftguard (client/server fee parity, canonical amounts, edge-function auth
coverage, migration grant integrity).
- `npm run build` — PWA build passes.
- CI: `.github/workflows/ci.yml` runs typecheck + tests + build on every push
  and PR to `main`; latest run green.
- **Live SQL attack battery** (`scripts/run-arena.sh`, Docker Postgres + the
  real migrations): impersonation, privilege escalation, IDOR, payout
  trigger integrity, and sale idempotency — all attacks blocked, all
  invariants held. Found and fixed during this pass: a revenue-leaking
  self-grant role policy, `ON CONFLICT` inference against a partial index,
  invalid `ADD TABLE IF NOT EXISTS` publication syntax, an illegal
  column-dropping `CREATE OR REPLACE VIEW`, and indexes on nonexistent
columns.
- **Attack battery v2** (`scripts/attack-battery-v2.sql`, same runner):
  deeper campaign with a second round of live-proven holes, all sealed at
  the root cause in `20260920140000_seal_attack_battery_v2_findings.sql`
  and all verified blocked:
  - **Payout double-spend state machine** — `paid → rejected` refunded the
    wallet *while keeping* `total_withdrawn` (money printed from nothing);
    `rejected → paid` paid out with no reservation. Sealed with terminal
    state freezing, money-column immutability, reservation enforcement on
    `paid`, one-time restoration on rejection, delete-proof financial
    rows, and a monotonic `total_withdrawn` guard.
  - **Certificate forgery** — any user could mint/rewrite publicly
    verifiable certificates, bypassing `claim_certificate` gating. Only the
    SECURITY DEFINER RPC can write now.
  - **Audit-log poisoning** — public INSERT on `system_logs` allowed
    flooding/forgeting entries; `write_system_log` also binds a client
    actor id to the JWT identity.
  - **Profile column tampering** — blanket UPDATE policy let users un-ban
    themselves, clear suspensions, zero `onboarding_balance_due`, and
    extend `affiliate_membership_expires_at` forever. Column-level grants
    now allow only `full_name`/`avatar_url`; admin flag writes moved to an
    audited `admin_update_user_flag` SECURITY DEFINER RPC with field/value
    allowlists and an admin-cannot-ban-admin rule.
  - **Vendor-URL stored XSS** — `javascript:`/`data:` URLs in product
    `file_url`/`external_url` were storable and opened by buyers. Sealed
    with schema CHECK constraints (any writer) plus a frontend scheme
    allowlist helper.
- **Red-team round 3** (`scripts/attack-battery-v3.sql`, same runner),
  sealed in `20260920150000_seal_redteam_round3_findings.sql` and verified:
  - **Verification-request self-approval** — a user could INSERT their own
    `verification_requests` row with `status='approved'`, forging an
    approved record in the admin queue. INSERT is now force-corrected to
    `pending` at the trigger level regardless of client.
  - **Lifetime membership for one month's price** — the `subscription`
    purpose charged a fixed ₦3,500 but trusted client
    `metadata.duration_days` (pay once with `duration_days=999999` =
    ~2,700 years of affiliate membership). Duration is now server-owned
    (30 days per purchase, stacking from the current expiry).
  - **Listing-payment self-verification** — vendors could INSERT their own
    `product_listing_payments` row with `status='verified'`, forging proof
    of the ₦2,000 listing fee. Client inserts are forced `pending`.
  - **Global-alert hijack** — any user could dismiss/hide platform-wide AI
    alerts for everyone else via the row-level UPDATE policy. Client
    UPDATE is revoked; only the per-user scoped RPCs can write, and global
    dismissals are now recorded per-user.
  - **Rate-limit identity spoofing** — the limiter trusted the FIRST
    `X-Forwarded-For` entry, which the client controls; rotating it
    per-request defeated every sliding-window limit. All limiters now use
    the LAST entry (the trusted proxy-appended value).
  - Re-verified clean: notification forgery, impersonated verification
    requests, product self-approval, vendor/affiliate/admin self-grant,
    coupon and affiliate metadata swapping (checkout server metadata is
    authoritative), refunded-sale delivery access (revoked), delivery
    token strength, and every edge function's authentication gate.
- **Concurrency red team (round 4)** — TRUE parallel-session races against
  the money paths, executed with simultaneous psql sessions in the arena:
  - **Webhook × callback double-processing**: 4 parallel
    `create_verified_sale` calls with the same payment reference →
    exactly 1 sale row, exactly 1 vendor credit (DB-level idempotency
    wins the race; side effects gate on `created=true`).
  - **Payout double-approval**: 3 parallel `pending → paid` transitions →
    `total_withdrawn` advanced exactly once (the FOR UPDATE row lock
    serializes the state machine).
  - **Coupon cap**: `increment_coupon_usage` is a single atomic
    `SET x = x + 1`; the theoretical soft-reserve race (two buyers
    passing the last coupon check before either increments) can exceed
    `max_uses` by one — accepted residual, vendor-side discount edge
    only, no money-path impact.
  - **Expire-vs-late-payment**: the expiry cron only marks
    `pending_payments` rows; value never flows from that status, so a
    late-arriving real Paystack verification is unaffected.

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
