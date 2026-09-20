# Mirvyn — Affiliate Commerce Marketplace

Mirvyn (repo: `veritaspay-com`) is a Nigerian-₦ affiliate commerce platform: vendors list digital products, affiliates promote them for commission, and every sale flows through Paystack with atomic wallet accounting.

**Stack:** Vite · React 18 · TypeScript · shadcn/Tailwind · TanStack Query · PWA · Supabase (Postgres + RLS + Deno Edge Functions + pg_cron) · Paystack · Resend

## Architecture at a glance

```
Browser (React PWA)
  │  anon key + user JWT — every table read/write passes Postgres RLS
  ▼
Supabase Edge Functions (Deno)          Supabase Postgres
  ├─ initialize-payment  ─► Paystack      ├─ wallets, pending_payments,
  ├─ paystack-callback ─┐                 │   sales, payout_requests
  ├─ paystack-webhook ──┤                 ├─ RLS: users see their own rows,
  │   (HMAC-verified)   │                 │   writes to money tables are
  │                     ▼                 │   service-role only
  │          _shared/verify-payment.ts    └─ SECURITY DEFINER RPCs:
  │   exact-kobo verify + claim race          create_verified_sale,
  │   protection + auto-refund                process_refund_atomic, …
  ├─ process-payouts ─► Paystack transfers
  └─ admin-update-payout (admin JWT gated)
```

Key invariants (do not break these):

1. **The server owns every amount.** Client-sent prices are ignored. Canonical purpose amounts live in `initialize-payment`; sale prices/coupons are resolved from the DB at checkout and snapshotted into `pending_payments.metadata`, which is authoritative end-to-end.
2. **Payments are verified server-to-server** with Paystack, exact-kobo matched against the pending intent, claimed atomically to survive callback/webhook races, and auto-refunded on mismatch.
3. **Privilege lives in `user_roles`** (admin-only writes via RLS). The frontend cannot self-grant anything; vendor self-activation goes through the `self_activate_vendor()` SECURITY DEFINER RPC (free role, hard-coded).
4. **Wallet mutations are atomic SQL**, never client calls: `create_verified_sale`, payout reservation/immutability triggers, `process_refund_atomic`.

## Repository layout

| Path | What it is |
|---|---|
| `src/` | React app (pages, dashboard, admin, hooks, lib) |
| `supabase/functions/` | Deno edge functions + `_shared/` modules |
| `supabase/migrations/` | Postgres schema, RLS, RPCs, triggers (newest last) |
| `src/test/driftGuard.test.ts` | **Money-rule drift guard** — fails CI if client/server fees, canonical amounts, edge-function auth, or migration grants drift apart |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Deployment + post-deploy verification steps |

## Local development

```bash
npm install
npm run dev        # Vite dev server
npm run build      # production PWA build
npm test           # vitest (unit + drift guard)
npx tsc --noEmit -p tsconfig.app.json   # typecheck
```

## Security model summary

- All edge functions run `verify_jwt = false` **by design**; authentication is enforced in-function (`_shared/auth.ts`, `isTrustedInternalRequest`, admin role checks) or replaced by stronger mechanisms (Paystack HMAC, delivery bearer tokens, cron secrets).
- Money tables (`wallets`, `pending_payments`, `sales`, `payout_requests`, `transactions`) are never written by the client; writes happen in atomic SQL or service-role functions.
- Admin endpoints verify the caller's JWT, then re-check the `admin` role from the database on every request.
- Fraud telemetry (`fraud_events`), access logs (`delivery_logs`), and system logs provide the audit trail.

See `PRODUCTION_DEPLOYMENT_GUIDE.md` for deployment steps and the security-hardening changelog.
