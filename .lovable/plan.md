# Mirvyn Launch-Blocker Fix Plan

This plan groups every issue you reported into 9 focused workstreams. Each ships in a single pass so the UI, DB and edge functions stay in sync.

---

## 1. Financial calculations (HIGH PRIORITY)

**Problem:** Vendor/admin dashboards show wrong totals; affiliate commission shown as ₦22,500 on a ₦25,000/60% sale (should be ₦15,000); "Your earnings" sums all balance buckets twice.

**Fix:**

- Audit `src/hooks/useStats.ts` (`useVendorStats`, `useAffiliateStats`) and `src/hooks/useWallet.ts`. Stop double-counting `pending + cleared + withdrawable` (cleared already moves into withdrawable).
- Fix `VendorSales.tsx` "Your Earnings" stat to use `wallet.total_earned` only.
- Verify `process-sale` edge function uses `commission_percent_snapshot` from the product at checkout time and writes the correct `affiliate_commission`, `vendor_earnings`, `platform_fee` per the corrected formula:
  - `affiliate_commission = total_amount * commission_percent / 100`
  - `platform_fee = total_amount * platform_fee_percent / 100` (10% standard, 15% waiver)
  - `vendor_earnings = total_amount - affiliate_commission - platform_fee`
- Backfill any existing miscomputed sales via a one-off SQL update (insert tool).
- Same fix applied to `AdminDashboard` aggregates.

## 2. Mobile responsiveness overflow (sales, intelligence, rankings, products, admin dashboard, vendor dashboard icons)

**Problem:** Numbers overflow `StatCard` boxes; tables overflow viewport on <768px.

**Fix:**

- `src/components/ui/stat-card.tsx`: add `truncate`, `min-w-0`, `text-balance`, scale down value font on mobile (`text-xl sm:text-2xl`), wrap icon in `shrink-0`.
- All admin tables (`AdminProducts`, `AdminRankings`, `AdminUsers`, `VendorSales`, `AffiliateAnalytics`): add the existing table-to-card pattern <768px (already used elsewhere) so rows stack as cards.
- `AffiliateToolkit`: re-grid to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with consistent card heights and spacing.

## 3. Verification badge — paid path

**Problem:** Paid path opens no payment flow; admin approve fails ("failed to update requests").

**Fix:**

- `SettingsPage.tsx`: when user picks "paid path", open `PaymentModal` (Paystack init via `initialize-payment` with `purpose=verification`, ₦ amount from `platform_settings`).
- New `paystack-callback` branch handles purpose `verification` → marks `verification_requests.payment_reference` and `status='pending_review'`.
- Fix `AdminVerificationRequests` update mutation: it currently fails because the row update also writes `updated_at` which doesn't exist on the table — remove that field, and on approve also update `profiles.is_verified=true`.

## 4. Certificate signature false-warning

**Problem:** Certificates page shows "signature not configured" even though admin signed.

**Fix:** `CertificatesPage.tsx` reads `platform_settings.admin_signature` but RLS hides it from non-admins. Replace with a public-safe boolean setting `admin_signature_configured` (true/false), updated by a trigger whenever `admin_signature` changes. Read that flag client-side instead.

## 5. Vendor announcements

**Problem:** No vendor name/brand shown, no expiry, no banner image, no URL field; onboarding never collects brand name.

**Fix:**

- Migration: add `brand_name text`, `business_url text` to `profiles`; add `expires_at timestamptz`, `banner_url text`, `link_url text` to `vendor_announcements`.
- `OnboardingFlow`: vendor step asks for brand name (saved to `profiles.brand_name`).
- `VendorAnnouncements` form: add expiry date picker, banner upload (avatars bucket), link URL field.
- Announcements list (affiliate side): show vendor avatar, brand name, expiry badge, banner image, click-through link.
- Filter out expired announcements in `useAnnouncements`.

## 6. Referral tracking broken

**Problem:** Signing up via `?ref=CODE` link doesn't record referral; manual code entry says "invalid".

**Fix:**

- `Register.tsx`: read `?ref=` and persist to `localStorage` AND pass into `signUp` metadata.
- After signup completion, `handle_new_user` trigger reads metadata and writes `profiles.referred_by` + `platform_referrals` row.
- Manual code entry: validate against `profiles.referral_code` OR `affiliate_referral_codes.referral_code` (currently only checks one); use `.maybeSingle()`.

## 7. Admin user management actions

**Problem:** Only role add/remove works; ban/suspend/verify/premium/message/fraud-flag are dead buttons.

**Fix:** `AdminUsers.tsx` — wire each button to mutations:

- Ban → `profiles.is_banned=true`
- Suspend → `profiles.suspended_until = now()+7d`
- Verify → `profiles.is_verified=true` (+ insert certificate-eligible audit)
- Premium → `profiles.vendor_tier='premium'`
- Send message → insert `user_messages` row
- Fraud flag → insert `fraud_events` row
- Add `ProtectedRoute`/middleware to block banned/suspended users at login.

## 8. Leaderboard, AI copilot, fraud, commission rules, revenue/AI, feature flags, materials

- **Leaderboard:** create `/dashboard/leaderboard` (affiliate + vendor views) showing ranked tables with the user's row highlighted; reuse `useLeaderboard` and ensure it computes by sales/commission for the period.
- **AI Copilot (`AdminAICopilot`):** rebuild as mobile-first card stack; make `ai-autonomous-scheduler` actually take non-financial actions (not limited to auto-approve clean products, auto-send digests, auto-flag fraud) and only NOTIFY admin for financial actions.
- **Fraud monitor:** finish UI — list `fraud_events`, allow resolve/hold-commission actions, link to user.
- **Commission rules page:** sync default values to current monetary model (10%/15% platform, ₦4,000 affiliate fee, ₦2,000 listing, ₦8,500/₦3,000 onboarding, withdrawal 2/3%).
- **Revenue & AI controls:** make sliders actually write to `platform_settings` and have `process-sale`/`process-payouts` read them at runtime.
- **Feature flags:** verify the `FeatureFlagRoute` guard is wired into ALL flagged routes and that hidden features don't render menu entries when off.
- **Materials page:** repurpose as "Promo Asset Library" — admin uploads banners/copy/swipe files that vendors+affiliates can browse and download from their toolkits.

## 9. Payment flows (vendor listing fee + onboarding fee)

**Problem:** Both flows incomplete — modal opens but nothing happens / no callback verification.

**Fix:**

- `ProductForm` listing-fee modal: call `initialize-payment` with `purpose=listing_fee`, redirect to Paystack, on callback `paystack-callback` inserts `product_listing_payments` row + flips product to `pending_review`.
- Vendor onboarding: same pattern with `purpose=vendor_onboarding`, deducts from `profiles.onboarding_balance_due` (Plan B) or marks plan paid (Plan A).
- Affiliate ₦4,000 membership: `purpose=affiliate_membership`, sets `profiles.affiliate_membership_expires_at`.
- All purposes handled centrally in `paystack-callback`.

## 10. Daily digest

**Fix:** `generate-daily-digest` cron is configured but never ran for users with no recent activity. Trigger it for ALL active vendors/affiliates daily, not just those with sales. Verify the function inserts to `daily_digests` with proper `digest_type` and that `Dashboard.tsx` reads `latestDigest` (already does).

---

## Technical execution order

1. Migrations: announcement fields, profiles brand_name/membership, signature_configured flag/trigger, backfill sales.
2. Edge functions: `process-sale` math fix, `paystack-callback` purpose router, `ai-autonomous-scheduler` autonomy upgrade, `generate-daily-digest` universal run.
3. Hooks: `useStats`, `useWallet`, `useAnnouncements`, `useReferrals`.
4. UI: StatCard, all overflow tables, OnboardingFlow, SettingsPage, CertificatesPage, VendorAnnouncements, Register, AdminUsers, AdminVerificationRequests, AdminAICopilot, AdminFraudDashboard, AdminCommissionRules, AdminRevenueControls, AdminFeatureFlags, AffiliateToolkit, leaderboard pages.
5. Re-run Supabase linter; QA each flow.

## Risks

- Backfilling sales math will change historical wallet balances — will log every adjustment to `system_logs`.
- Signature-configured flag requires admins to re-save signature once to populate.
- Adding required brand_name to onboarding doesn't retroactively fill existing vendors — they'll be prompted on next dashboard visit.

Approve to proceed and I'll execute all 10 workstreams in one go.