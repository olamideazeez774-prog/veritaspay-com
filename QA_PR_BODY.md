## Summary

This PR contains the launch-critical root QA remediation for Mirvyn’s payment, wallet, payout, database-policy, core-admin workflow, and trusted-function boundaries. The monetary model is unchanged.

### Security and financial integrity

Payment initialization now binds authenticated non-sale intents to the verified JWT subject, while guest sale checkout remains supported. Paystack callback/webhook activation now claims pending payments atomically before activation, and a new atomic sale RPC covers sale insertion, the existing onboarding deduction, wallet credits, and payment-reference idempotency. Refund processing now reverses all sale wallet transactions in one transaction with reversal lineage.

Payout processing remains `processing` until Paystack emits `transfer.success`; HMAC-verified webhook handling now reconciles `transfer.success`, `transfer.failed`, and `transfer.reversed`. The final hardening migration reasserts the frozen ₦3,500 payout minimum and drops the historical buyer-email sales SELECT policy. Fraud detection now requires trusted internal authorization.

### Core workflow hardening

Certificate claims are now server-authorized. The new RPC enforces authenticated ownership, signature readiness, rank/earning milestone eligibility, duplicate protection, and server-generated certificate metadata and hashes. Admin verification approvals/rejections now use an atomic review RPC so request state, reviewer identity, notes, and profile verification cannot diverge after a partial failure.

### Existing remediation retained in this branch

The branch also retains fail-closed trusted internal authorization for financial and scheduled functions, verified JWT refund identity, payment purpose/buyer/product/idempotency checks, cryptographically random token-bound delivery links, listing-fee `pending_review` behavior, AI insight authentication and bounded inputs, atomic payout claiming, the mobile-first UX redesign, and the Vite preview host allowlist.

### Validation

`npm test -- --run` passes with **8 tests across 2 files**. `npx tsc --noEmit` passes. `npm run lint` passes with 12 existing Fast Refresh warnings and 0 errors. `npm run build` passes and generates the PWA service worker. `git diff --check` passes. No real payments, payouts, refunds, or destructive production mutations were performed.

### Deployment verification still required

The deployed `www.mirvyn.app` bundle was verified to be missing the literal Supabase URL and publishable key that exist in the local build. The source now has a defensive bootstrap screen instead of failing to a blank root, but the Vercel build must still receive `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in its production environment and be redeployed before launch.

PWA installability was also hardened: the three declared icon assets are now true square dimensions, and the generated manifest opens the public homepage instead of the protected dashboard for first-time installs. Adversarial review also hardened delivery and social-share new-tab links with `noopener,noreferrer`.

The live Supabase database was not available for read-only inspection during this pass. Before launch, verify that migrations `20260820000000_launch_integrity_hardening.sql`, `20260820010000_certificate_claim_integrity.sql`, and `20260820020000_verification_review_integrity.sql` are deployed; inspect live `pg_trigger` and `pg_policies`; confirm Paystack transfer webhook events are configured; and run a sandbox-only end-to-end payment/payout/refund rehearsal. These items are intentionally not represented as fully verified by source-only evidence.
