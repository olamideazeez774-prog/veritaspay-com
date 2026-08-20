# Reconcile Migrations, Deploy Functions, Verify Backend

## What the database check found

The three new migrations are **not applied** to the live backend — and neither are the two pricing migrations that came before them. Confirmed against the live database:

Missing right now:
- `pending_payments`: no `expected_amount_kobo`, `received_amount_kobo`, `paystack_transaction_id`, fee-in-kobo columns, `mismatch_reason`, refund fields, `processing_started_at`
- `sales`: no `delivery_access_token`, `required_amount_kobo`, `received_amount_kobo`, `paystack_transaction_id`, or any processing-fee-in-kobo columns, no `payment_processing_fee_bearer`
- `transactions`: no `reversal_of_transaction_id`
- Unique indexes `sales_payment_reference_unique` and `transactions_reversal_source_unique` absent
- Functions `create_verified_sale`, `process_refund_atomic`, `claim_certificate`, `review_verification_request` do not exist
- Live `enforce_payout_request_integrity` still enforces a ₦2,500 minimum, while `platform_settings.min_withdrawal_amount` says ₦5,000 and the new migration sets ₦3,500 — this needs one authoritative number

Already in place (safe, no action): `certificates.cert_type` / `threshold_amount`, `affiliate_ranks.description`, `payout_requests.transfer_code` / `transfer_status` / `funds_reserved`, and the old public `sales` buyer-email policy is already gone. No duplicate `payment_reference` rows exist, so the unique index will build cleanly.

Consequence: `process-sale` and `process-refund` currently call RPCs that don't exist, and `CertificatesPage` / `AdminVerificationRequests` call `claim_certificate` / `review_verification_request` which don't exist. Sales, refunds, certificate claims, and verification approvals are broken in production until the migrations land. **Migrations must be applied before the functions are deployed.**

## Execution order

1. **Apply migration `20260819000000` (payment processing fee architecture)** — adds the kobo/fee columns on `products`, `sales`, `pending_payments` that everything downstream depends on.
2. **Apply migration `20260819010000` (authoritative pricing)** — fee-bearer value normalisation, `affiliate_processing_fee_kobo`, `compute_withdrawal_fee`, listing-model fee rules, pricing settings rows.
3. **Apply migration `20260820000000` (launch integrity hardening)** — `processing_started_at`, `reversal_of_transaction_id`, the two unique indexes, `create_verified_sale`, `process_refund_atomic`, and the payout trigger reassertion.
4. **Apply migration `20260820010000` (certificate claim integrity)** — `claim_certificate`, server-side milestone and signature gating, `authenticated`-only execute grant.
5. **Apply migration `20260820020000` (verification review integrity)** — `review_verification_request`, admin-only, keeps `verification_requests.status` and `profiles.is_verified` in sync.
6. **Reconcile the withdrawal minimum** — before step 3 goes in, confirm which value is authoritative (₦3,500 in the migration vs ₦5,000 in settings) and align the trigger, `platform_settings.min_withdrawal_amount`, and the client-side copy so all three agree.
7. **Deploy edge functions** — `process-sale`, `process-refund`, `initialize-payment`, `paystack-callback`, `paystack-webhook`, `process-payouts`, `clear-earnings`, `cleanup-stale-payments`, `get-delivery`.
8. **Verify RLS, triggers, and grants** — run the database linter; confirm the four new functions are `SECURITY DEFINER` with `search_path` set and executable only by the intended role (`service_role` for the two sale/refund functions, `authenticated` for claim/review, never `anon`); confirm payout triggers point at the new function body; confirm `sales` policies still allow vendor/affiliate/admin reads and that buyer access is token-only.
9. **Confirm Paystack transfer webhooks** — verify `paystack-webhook` handles `transfer.success` / `transfer.failed` / `transfer.reversed` against the live `payout_requests` shape (`transfer_code`, `transfer_status`, `failure_reason`, `processed_at` all exist), that the `MV-PO-<id>` reference parsing matches what `process-payouts` sends, and that HMAC signature rejection works. Report the webhook URL that must be registered in the Paystack dashboard for both charge and transfer events.
10. **Verify secrets** — presence-only check, no values printed or logged. `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` are present. Missing and needed: `RESEND_API_KEY` (transactional email returns 503 without it) and an `INTERNAL_FUNCTION_SECRET` / `CRON_SECRET` for the internal-only cron functions, plus `SITE_URL` if email links must be absolute. I will report what is missing and request each one through the secret prompt rather than inventing values.
11. **Smoke-verify** — after deploy, exercise a verified-sale path against a duplicate reference (must return the existing sale and not double-credit), a refund reversal (must debit once and write the reversal row), a certificate claim below threshold (must be rejected server-side), and a verification approval (must flip both request status and profile badge).

## Technical notes

- Each migration is applied through the approval flow one at a time, in the order above, using the exact SQL already in `supabase/migrations/` byte-for-byte, so the repo and the live database record the same migration.
- No pricing, commission, onboarding, listing, or fee rule is changed beyond what those migration files already contain — the only new decision is the single authoritative withdrawal minimum.
- Cron job inspection is not available through the restricted psql role; the `pg_cron` schedules for `clear-earnings` and `process-payouts` will be verified through the backend query tooling instead.
- No application source changes are planned other than any copy or constant needed to keep the withdrawal minimum consistent.
