## Summary

This PR contains the launch-critical root QA remediation for Mirvyn’s payment, wallet, payout, database-policy, and trusted-function boundaries. The monetary model is unchanged.

### Security and financial integrity

- Added verified JWT identity binding for non-sale payment initialization and mismatch rejection for authenticated callers.
- Added a conditional `pending -> processing` payment claim with stale-claim recovery to close callback/webhook activation races.
- Added an atomic `create_verified_sale` RPC covering sale insertion, the existing onboarding deduction, vendor/affiliate wallet credits, and payment-reference idempotency.
- Added an atomic `process_refund_atomic` RPC with reversal lineage and single-transaction wallet reversal.
- Changed payout processing to remain `processing` until Paystack emits `transfer.success`; added HMAC-verified reconciliation for `transfer.success`, `transfer.failed`, and `transfer.reversed`.
- Reasserted the frozen ₦3,500 payout minimum trigger in the final migration order and dropped the historical buyer-email sales SELECT policy.
- Added trusted-internal authorization to fraud-detection’s service-role path.
- Preserved existing pricing and fee rules: 5% platform commission, ₦2,000 listing fee, ₦350 monthly affiliate membership, ₦3,500 minimum withdrawal, existing fixed withdrawal tiers, and existing Paystack fee-bearer policy.

### Existing remediation retained in this branch

- Fail-closed trusted internal authorization for financial/scheduled functions.
- Verified JWT identity derivation for refunds and atomic completed-to-refunded state protection.
- Pending-payment purpose, buyer, product, and idempotency checks.
- Cryptographically random token-bound delivery links.
- Listing-fee confirmation keeps products in `pending_review`.
- AI insights authentication, admin gating, payload limits, and bounded inputs.
- Atomic payout claiming before any Paystack transfer call.
- Mobile-first UX redesign and Vite preview host allowlist.

### Validation

- `npm test -- --run`: **8 tests passed** across 2 files.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 12 existing Fast Refresh warnings and 0 errors.
- `npm run build`: passed; PWA service worker generated.
- `git diff --check`: passed.

No real payments, payouts, refunds, or destructive production mutations were performed.

### Deployment verification still required

The live Supabase database was not available for read-only inspection during this pass. Before launch, verify that migration `20260820000000_launch_integrity_hardening.sql` is deployed; inspect live `pg_trigger` and `pg_policies`; confirm Paystack transfer webhook events are configured; and run a sandbox-only end-to-end payment/payout/refund rehearsal. These items are intentionally not represented as fully verified by source-only evidence.
