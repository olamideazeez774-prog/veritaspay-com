# Pre-Launch Hardening Plan (June 15)

Goal: ship Mirvyn with zero known issues. Audit every route, every paid action, every admin tool, every mobile breakpoint. When a feature flag is OFF, the feature must not exist in the UI at all (no menu entry, no card, no button, no banner).

## 1. Feature-flag UI gating (true "doesn't exist" mode)

Today flags only block route access and a few menu items. We will make flags fully erase the feature.

Scope:
- Centralize gating in `useFeatureFlag` + add a `<FeatureGate flag="...">` component used inline anywhere a flag-controlled UI fragment appears (buttons, cards, sections, banners).
- Sweep every page and hide UI when the flag is off, not just disable behavior:
  - `listing_fees`: hide all listing-fee CTAs/badges on `ProductForm`, vendor dashboard, admin sidebar entry, Listing Payments page link, listing-fee tooltips. When OFF, products are created without payment step.
  - `platform_fees`: hide platform-fee columns in `VendorSales`, wallet breakdowns, admin analytics charts referencing platform fee.
  - `withdrawal_fees`: hide fee preview row on `PayoutsPage`, admin payout cards.
  - `promo_campaigns`: hide `AffiliateToolkit` campaigns tab + admin promo materials section affected pieces.
  - `ai_modules`: hide AI Assistant page route + sidebar entry, AI Copilot admin link, AI insights cards on vendor/affiliate dashboards, Intelligence menu, AI optimization settings tab in Settings.
  - `commission_boosts`: hide boost badges/UI in affiliate stats, commission rule "boost" controls in admin.
  - `vendor_onboarding`: hide vendor option from `RoleSelector`.
  - `affiliate_rewards`: hide reward banners, leaderboard reward tags.
  - `ranking_algorithm`: hide rank widgets on dashboards, marketplace sort-by-rank.
  - `experiments`: hide admin experiments link (already routed).
  - `affiliate_toolkit`: hide sidebar entry + dashboard quick link.
  - `certificates`: hide Certificates sidebar, dashboard CTA, rank certificate banners.
  - `daily_digest`: hide Daily Digest sidebar + notification CTA.
  - `leaderboard`: hide leaderboard widgets on Dashboard, sidebar entries (vendor/affiliate/admin).
- Admin sidebar: filter `adminNavItems` against flags exactly the same as `navItems`.
- Marketplace + landing pages: gate any leaderboard/certificate badges shown to anonymous users.

## 2. Paystack / paid-action airgap audit

The webhook + verifier exists; complete the loop and verify every paid surface routes through it.

- Confirm every paid surface uses `initialize-payment` with the correct `purpose` and renders the Paystack `authorization_url` (no inline activation). Surfaces: vendor onboarding, affiliate onboarding, product listing fee, verification badge, premium upgrade, future subscriptions, sale checkout.
- `PaymentCallback.tsx`: on failure show retry + return; on success poll `pending_payments.status` until `verified` (handles race where browser is faster than webhook) then `refreshProfile()` and route via the purpose redirect map.
- Add a server-side `cleanup-stale-payments` cron job: any `pending_payments` older than 30 min in `pending` status is marked `expired` and never activates.
- Add an idempotency guard already present (verified → noop); add the same guard in `process-sale` keyed on `payment_reference` to prevent duplicate sales.
- Verify `paystack-webhook` HMAC + `pending_payments` row are written BEFORE the Paystack init call (already correct in code; add unit-style log assertions in callback).
- Wire Paystack dashboard webhook URL into the deployment guide so launch checklist is explicit.
- Add a small "Pending Payments" admin table page so admins can see/refund stuck payments.

## 3. Mobile responsiveness sweep (target: 320–414 CSS px)

Audit every page at 384px and fix overflow:
- Admin: `AdminProducts`, `AdminUsers`, `AdminPayouts`, `AdminListingPayments`, `AdminFraudDashboard`, `AdminCommissionRules`, `AdminFeatureFlags`, `AdminRevenueControls`, `AdminAICopilot`, `AdminLogbook`, `AdminMessaging`, `AdminPromoMaterials`, `AdminRankings`, `AdminLeaderboard`, `AdminAnalytics`, `AdminVerificationRequests` — convert any `<table>` wider than viewport to card list <768px; wrap remaining tables in `overflow-x-auto` with explicit `min-w-0` on parents.
- Vendor: `VendorSales`, `VendorProducts`, `VendorAnnouncements`, `VendorToolkit`, `ProductForm` — fix stat-card icon overflow and empty-state digit wrapping.
- Affiliate: `AffiliateStats`, `AffiliateAnalytics`, `AffiliateLinks`, `AffiliateReferrals`, `AffiliateToolkit` — same treatment.
- Shared: `WalletPage`, `PayoutsPage`, `SettingsPage`, `InboxPage`, `DailyDigestPage`, `LeaderboardPage`, `CertificatesPage`.
- Add a shared `<ResponsiveTable>` helper (mobile card / desktop table) to avoid one-off fixes.

## 4. Admin tooling correctness pass

- `AdminVerificationRequests`: approve/reject buttons must update `verification_requests.status`, write notification, and on approve set `profiles.is_verified = true`. Confirm RLS + service-side update path.
- `AdminUsers`: ban/suspend/verify/premium/message/fraud-flag actions confirmed wired (recent RLS fix). Add toast + optimistic refetch on each.
- `AdminFeatureFlags`: writing to `platform_settings.feature_flags` invalidates `["feature-flags"]` query everywhere; persistence verified across reload.
- `AdminRevenueControls`: sliders persist to `platform_settings` keys (`withdrawal_min`, `platform_fee_default`, `verification_fee`, etc.) and are read on the relevant flows.
- `AdminCommissionRules`: rules editor writes to `commission_rules`; `process-sale` reads same table.
- `AdminFraudDashboard`: list, filter, resolve actions on `fraud_events`. Verify resolve writes `status='resolved'` and audit log.
- `AdminPromoMaterials`: upload/edit/delete works against `promo_materials` + `avatars` bucket.
- `AdminAICopilot`: mobile rebuild verified; tabs scrollable on 320px.

## 5. Functional + data correctness

- Referral `?ref=` capture (URL → localStorage → `signUp({ data: { referral_code }})`) verified end-to-end with a manual test in the plan checklist.
- Daily digest generator handles users with zero activity (still produces an "empty week" digest).
- Leaderboard query handles ties and excludes admins.
- Vendor announcements form exposes brand_name / expires_at / banner_url / link_url and validates URLs.
- Onboarding flow asks for `brand_name` for vendors (stored in `profiles.brand_name`).
- `useFeatureFlag` returns `enabled: true` while loading to prevent UI flicker that hides features briefly.

## 6. Final QA checklist (must pass before publishing)

1. Run `supabase--linter` — no high/critical findings.
2. Run `security--run_security_scan` — no exposed PII/RLS gaps.
3. Manual smoke: register w/ ref → vendor onboarding pay → list product pay → buyer checkout → vendor sees sale → wallet pending → clear-earnings cron → withdraw → admin approves payout.
4. Toggle each flag OFF in admin → reload → confirm no UI for that feature anywhere.
5. Visit every route at 384×704 and confirm no horizontal scroll.

## Technical notes

- New file: `src/components/FeatureGate.tsx` — thin wrapper around `useFeatureFlag` that renders `null` when off (and optional `fallback`).
- New file: `src/components/ui/responsive-table.tsx` — props `{ columns, rows, mobileCard }` to standardize the table→card pattern.
- New edge function: `cleanup-stale-payments` (scheduled via pg_cron every 10 min).
- New admin page: `src/pages/admin/AdminPendingPayments.tsx` listing `pending_payments` with filters.
- Migration: add `expired` to `pending_payments.status` allowed values; add index on `(status, created_at)`.
- No changes to `process-sale` business logic; only add `payment_reference` idempotency guard.

## Out of scope

- New features beyond what already exists.
- Redesign of any page (only overflow / gating fixes).
- Migration to a different payment provider.
