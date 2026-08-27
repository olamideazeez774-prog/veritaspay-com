# Bring the live backend fully in sync with the codebase

An audit of the repo against the live backend shows most of the schema is already live: all 34 tables, the delivery-token system, the payment fee/kobo columns, and all four newer routines (`create_verified_sale`, `process_refund_atomic`, `claim_certificate`, `review_verification_request`) exist. Two database changes in the repo have never been applied, one edge function has a column bug that breaks digital delivery, one background job has no schedule, and two backend secrets are missing.

## 1. Apply the payout-hold change

The live payout trigger still holds new withdrawal requests for 12 hours; the repo version holds them 30 seconds so the every-30-minute payout job picks them up almost immediately. Apply that migration as written.

## 2. Remove the referral / second-tier system (live)

The removal migration in the repo drops the referral tables, the profiles referral code, and the second-tier commission columns. Applied as-is it would break signup and sale creation, because two live routines still use those objects:

- the new-user trigger inserts into the referral tables and calls a referral-code generator that the migration drops
- the verified-sale routine takes second-tier affiliate and commission arguments and writes them to the sales table

So this ships as one migration that drops the referral objects and, in the same transaction, replaces both routines with referral-free versions (signup creates profile + wallet only; sale creation handles vendor and single-tier affiliate earnings only).

Code cleanup in the same pass:

- `supabase/functions/process-sale/index.ts` — remove second-tier lookup, commission math, and the fields it sends to sale creation
- `src/types/database.ts` — drop the referral and second-tier fields
- `src/pages/InfoPage.tsx` — remove referral-program copy if any remains

## 3. Fix digital delivery, then deploy every edge function

`supabase/functions/get-delivery/index.ts` selects `access_count`, a column that does not exist — the live column is `buyer_access_count`. Every delivery-page load currently fails. Fix the select and the response field, then deploy all 16 functions so the live copies match the repo.

## 4. Schedule the missing background job

`cleanup-stale-payments` is deployed but has no schedule, so abandoned payment intents never expire. Add a cron entry (every 15 minutes) alongside the existing earnings-clearing and payout jobs, using the same call pattern.

## 5. Missing secrets

The internal-call secret used by the cron-triggered functions and the transactional email key are not set, so scheduled clearing/cleanup calls can be rejected and email silently fails. I'll request them; you paste the values into the secure prompt (nothing is printed back).

## 6. Verify

- Confirm the referral objects are gone, the payout trigger holds 30 seconds, and signup + sale creation still succeed
- Run the database linter and report anything new
- Confirm all 16 functions report deployed and the three cron jobs are active
- Typecheck and build clean

## Technical notes

- Migrations applied through the approval flow; the payout-hold file goes in byte-for-byte, the referral removal ships as one combined migration (drops + `handle_new_user` + `create_verified_sale` replacements) so the database is never left in a broken intermediate state.
- Old `create_verified_sale` overload is dropped explicitly so no stale signature remains callable.
- Generated Supabase types refresh after the migrations; frontend edits that depend on the new shape land after that.
