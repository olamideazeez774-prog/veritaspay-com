
# VeritasPay Production Hardening -- Complete Implementation Plan

This plan covers every remaining gap, broken flow, placeholder, and mobile responsiveness issue across the entire platform. Changes are grouped by system for clarity but will be implemented together.

---

## 1. REFERRAL SYSTEM -- FINAL HARDENING

The referral codes are now generated correctly (verified: `VP1523FC`, etc.). Remaining fixes:

### Register.tsx
- The `ref` param capture already works. Add **cookie-based** persistence alongside localStorage for redundancy (set a `vp_ref` cookie with 30-day expiry on page load).
- After signup, ensure `recordPlatformReferral` is called **only after** the user confirms email and the auth session is established (move from signup handler to a post-login check).

### useReferrals.ts
- Add retry logic with `retryDelay: 1000` and `retry: 3` to `useUserReferralCode` to handle race conditions where the profile trigger hasn't fired yet. (Already partially done -- verify and clean up.)
- Remove any `// TODO` comments.

### AffiliateReferrals.tsx
- Wire real **click count** by querying the `clicks` table joined through `affiliate_links` for the user.
- Show **purchase count** from `sales` where `affiliate_id = user.id`.
- All 4 stat cards (Total Referrals, Vendors Referred, Affiliates Referred, Commission Earned) are already wired to real data -- verify no mocks remain.

---

## 2. CERTIFICATE SYSTEM -- UNIQUE RANK DESIGNS + ADMIN SIGNATURE

### Database Changes
- Add `admin_signature_url` column to `platform_settings` (store as a JSON value under key `admin_signature`).
- No new tables needed -- `certificates` table already exists with `metadata` JSON column.

### Admin Signature Pad (New Section in Settings or Revenue Controls)
- Add a **canvas-based signature pad** component to admin settings.
- When admin draws and saves, convert canvas to PNG data URL.
- Store in `platform_settings` under key `admin_signature` as `{ url: "data:image/png;base64,..." }`.
- Certificate generation will be **blocked** if no signature is saved (show warning).

### Certificate PDF Generation -- Unique Per Rank
Each rank gets a completely different visual design in the PDF generator:

| Rank | Background | Title Color | Border Style | Badge |
|------|-----------|-------------|-------------|-------|
| Bronze | Dark slate (#1e293b) | Copper (#b87333) | Single thin border | Circle with "B" |
| Silver | Charcoal (#374151) | Silver (#c0c0c0) | Double border | Shield with "S" |
| Gold | Deep navy (#0f172a) | Gold (#d4af37) | Triple ornate border | Star with "G" |
| Diamond | Black (#030712) | Ice blue (#93c5fd) | Diamond pattern border | Diamond shape |
| Platinum | Dark purple (#1e1b4b) | Platinum (#e5e7eb) | Gradient metallic border | Hexagon with "P" |
| Elite | Pure black (#000000) | Rainbow gradient text | Animated-style double border | Crown icon |

Each certificate PDF will include:
- Rank-specific background color and border
- "CERTIFICATE OF ACHIEVEMENT" in rank-specific metallic font color
- Rank name with unique styling
- Affiliate name (dynamic)
- Total commission earned at time of issue
- Milestone date
- Platform name
- Certificate ID hash
- Verification URL with QR code (rendered as image)
- **Admin signature image** (pulled from platform_settings)
- Rank badge watermark

### CertificatesPage.tsx Updates
- Pass `totalEarned` into certificate metadata when claiming.
- Include `milestone_date`, `total_commission`, `platform_name` in metadata.
- Download function updated to use rank-specific designs.
- Add PNG export option using `html2canvas`.
- Block claim if admin signature not configured (fetch and check).

### Admin Certificate Preview Mode
- When admin visits `/dashboard/certificates`, detect admin role.
- Auto-generate preview certificates for ALL ranks (Bronze through Elite).
- Mark them with `is_preview: true` in metadata.
- Do not count toward leaderboard or rewards.
- Show a banner: "Preview Mode -- These are sample certificates for QA."

### VerifyCertificate.tsx
- Add affiliate name display (join with profiles table).
- Add rank badge visual.
- Add social share meta tags (og:image, og:title).

---

## 3. AI COPILOT -- COMPLETE TOGGLE FIX

### AdminAICopilot.tsx Issues
- The "Advisory" vs "Auto" mode toggle already exists but "Auto" mode has no actual execution logic.
- Fix: Add actual auto-action buttons that:
  1. Read flagged fraud events and auto-hold commissions.
  2. Apply promo boosts from commission_rules.
  3. Adjust ranking_score on products based on performance data.
- Each auto action inserts into `ai_decisions` table with `was_auto: true`.
- Add **budget cap input** and **margin floor input** that block auto-actions when exceeded.
- Add rollback button on each decision log entry.

### Hard Guardrails (enforced in ai-insights edge function)
- Already declared in UI -- enforce in code:
  - If action type is `payout_approval` and amount > configurable threshold, reject.
  - Never allow `DELETE` operations from AI.
  - Never modify `platform_fee_percent` or core fee columns.
- Log every guardrail block in `ai_decisions` with `blocked: true`.

---

## 4. FEATURE FLAG ENGINE -- PRODUCTION HARDENING

### AdminFeatureFlags.tsx
- Already functional with audit trail, rollback, and reason logging.
- Add: when a flag changes, write to `system_logs` table (call `write_system_log` RPC).
- Add: export flag history as CSV.
- No mocks or placeholders remain.

---

## 5. MICRO MAINTENANCE FEE ENGINE

### AdminRevenueControls.tsx
- Already has all fee fields (processing_buffer_fee, withdrawal_fee_percent, withdrawal_flat_fee, verification_badge_fee).
- Fix: ensure these values are **read and applied** in the `process-sale` edge function and payout processing.
- Add fee display in the wallet/payout pages so users see the breakdown.

### PayoutsPage.tsx (User-facing)
- When requesting a payout, calculate and display the fee deduction:
  - `withdrawal_fee = (amount * withdrawal_fee_percent / 100) + withdrawal_flat_fee`
- Show net amount after fees.
- Read fee settings from `platform_settings` table.

---

## 6. VENDOR SYSTEM HARDENING

### AdminUsers.tsx
- Add **vendor tier toggle** (normal/premium) in the manage roles dropdown.
- Add **verification badge toggle**.
- When admin assigns premium to a user, check if user has admin role -- if so, skip premium fee (admin auto-premium).

### Vendor Announcements Delivery
- VendorAnnouncements.tsx already creates announcements.
- AffiliateToolkit.tsx already shows them in the "Updates" tab.
- Add: show announcement count badge in sidebar nav when new announcements exist.

---

## 7. DAILY PERSONALIZED MESSAGE ENGINE

### Database
- Create `daily_digests` table (user_id, digest_type, content JSON, created_at, is_read).

### Backend Logic
- Create new edge function `generate-daily-digest` that:
  - For each affiliate: queries their sales, clicks, streaks, and generates a personalized summary.
  - For each vendor: queries their recent sales, affiliate activity, optimization tips.
  - Uses AI (Lovable AI gateway) to generate personalized tips based on real data.
  - Stores in `daily_digests` table.

### Frontend
- Add a "Daily Digest" card on the main Dashboard page showing the latest digest.
- Real data, not templates.

---

## 8. COMMISSION RULE ENGINE -- WEEKLY MAINTENANCE

### process-sale Edge Function
- Before calculating commission, query `commission_rules` table.
- Check if affiliate has met the 15 sales/week threshold.
- If yes, apply 40% commission (forward-only upgrade).
- Check grace period: if last week met threshold but this week hasn't, maintain rate for 1 more week.
- After grace period expires, revert to base rate.
- Log the applied rule in the sale metadata.

### AdminCommissionRules.tsx
- Add visual indicator for "Weekly Threshold" rule type.
- Show current week's performance per affiliate inline.

---

## 9. PWA -- VERIFY COMPLETE

- PWA is already configured in `vite.config.ts` with `vite-plugin-pwa`.
- Manifest, icons, service worker, and runtime caching are set up.
- `/install` page exists.
- Verify: ensure service worker caches dashboard shell and API responses with stale-while-revalidate.
- No changes needed unless broken.

---

## 10. ADMIN PRIVILEGE OVERRIDES

### useAuth.tsx / ProtectedRoute
- Add a helper: `isPremium = isAdmin || profile?.vendor_tier === 'premium'`.
- In all fee calculation paths, check `isAdmin` -- if true, set fee to 0.
- In certificate/rank pages, if admin, auto-set rank to Elite and skip reward payouts.
- In payout processing, if admin, skip withdrawal fees.

---

## 11. MOBILE RESPONSIVENESS FIXES -- ALL ADMIN PAGES

### Pages that need mobile layout fixes:

**AdminRankings.tsx** -- Currently has inline inputs and switches that overflow on mobile.
- Convert to stacked card layout on mobile with the score input, featured/sponsored toggles below the product info.

**AdminCommissionRules.tsx** -- Create dialog form overflows on small screens.
- Make dialog scrollable, stack grid-cols-2 fields to grid-cols-1 on mobile.

**AdminAICopilot.tsx** -- Analysis buttons grid needs responsive breakpoints.
- Already uses `sm:grid-cols-2 lg:grid-cols-4` -- verify it works.

**AdminRevenueControls.tsx** -- Number inputs and toggle fields are functional but:
- Ensure the "Save All" button doesn't overlap the header on mobile.
- Make glass-card sections have proper padding on mobile (`p-4` instead of `p-6`).

**AdminExperiments.tsx** -- Variants JSON textarea in create dialog too small on mobile.
- Make dialog content scrollable with `max-h-[80vh] overflow-y-auto`.

**AdminFeatureFlags.tsx** -- Toggle rows with rollback buttons might wrap poorly.
- Ensure flex-wrap and proper spacing.

**AdminAnalytics.tsx** -- Calendar popovers may overflow viewport on mobile.
- Add `side="bottom"` and proper alignment.

**AdminLogbook.tsx** -- Filter bar needs stacking on mobile.
- Already uses `flex-col sm:flex-row` -- verify it works.

**AdminMessaging.tsx / AdminPromoMaterials.tsx** -- Mostly functional, minor touch target sizes.

**General fixes across all admin pages:**
- Replace any remaining `hidden sm:block` table patterns with mobile card views where missing.
- Ensure all Dialog components use `max-h-[85vh] overflow-y-auto` on DialogContent.
- Minimum 44px touch targets on all interactive elements.

---

## 12. CLEANUP

### Remove across entire codebase:
- Any `// TODO` comments
- Any `// placeholder` or mock data references
- Any `as any` type assertions that can be properly typed
- Unused imports

### Verify all dashboards read from real database:
- AdminDashboard stats -- uses `useAdminStats` (real query) -- OK
- AdminAnalytics -- uses `useAdminAnalytics` (real query) -- OK
- AffiliateReferrals -- uses `useReferredUsers` (real query) -- OK
- AffiliateAnalytics -- uses real affiliate_links and sales queries -- OK
- Leaderboard -- uses `useLeaderboard` (real query) -- OK

---

## Technical Summary

### Database Changes
- New table: `daily_digests` (user_id, digest_type, content, created_at, is_read)
- New platform_settings key: `admin_signature` (stores signature image)

### New/Modified Edge Functions
- `generate-daily-digest`: AI-powered daily summaries for affiliates and vendors
- `process-sale`: Add commission rule engine evaluation with weekly threshold logic
- `ai-insights`: Add guardrail enforcement and action logging

### Modified Pages (approximately 15)
- All admin pages for mobile responsiveness
- CertificatesPage for unique rank designs and admin signature
- VerifyCertificate for enhanced display
- AdminAICopilot for working auto mode
- AdminUsers for vendor tier management
- PayoutsPage for fee breakdown display
- Dashboard for daily digest card
- SettingsPage (admin section) for signature pad

### New Components
- SignaturePad component (canvas-based drawing)
- DailyDigestCard component
