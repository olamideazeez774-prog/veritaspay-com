
# VeritasPay Platform - Comprehensive Production Upgrade Plan

This is a large-scale upgrade covering core platform fixes, new feature systems, PWA support, and admin tooling. The work is organized into **6 implementation phases** to ensure stability at each step.

---

## Phase 1: Referral System Fix + Core Tracking (Critical Priority)

The referral link is broken because `affiliate_referral_codes` may return empty codes. This must be fixed first since it blocks the entire affiliate flow.

### Database Changes
- Add a `referral_code` column directly to the `profiles` table (auto-generated via trigger on user creation) so every user -- not just affiliates -- has a referral code
- Update `handle_new_user()` function to also insert into `affiliate_referral_codes` automatically
- Backfill any existing users who have empty or missing referral codes

### Frontend Fixes
- Update `useReferrals.ts` to always return a valid code, with retry logic if the trigger hasn't fired yet
- Update `Register.tsx` to persist the `ref` query param into `localStorage` immediately on page load, so it survives page refreshes
- After successful signup, read from `localStorage` and call `recordPlatformReferral`
- Block self-referrals (check if referrer ID equals new user ID)
- Update `AffiliateReferrals.tsx` to show total clicks, signups, purchases, and commissions earned (query from `platform_referrals` joined with `sales`)

### Edge Function Updates
- Update `track-click` to also log referral-type clicks (platform referral vs product affiliate)
- Ensure `process-sale` correctly attributes the affiliate from `localStorage`/cookie

---

## Phase 2: PWA (Progressive Web App) Setup

### Technical Setup
- Install `vite-plugin-pwa` dependency
- Configure in `vite.config.ts` with manifest (app name: VeritasPay, theme color, icons)
- Add PWA meta tags to `index.html` (viewport, apple-mobile-web-app-capable, theme-color)
- Create PWA icon set in `/public/` (192x192, 512x512)
- Configure service worker for offline caching of dashboard pages
- Create `/install` page with add-to-home-screen prompt logic

### Offline & Performance
- Cache dashboard shell and static assets via service worker
- Use `workbox` runtime caching strategies for API calls (stale-while-revalidate)
- Background sync for pending actions (payout requests, etc.)

---

## Phase 3: Admin Feature Flag System + Revenue Controls

### Database Changes
- Extend `platform_settings` table to store feature flags as JSON objects with metadata (who changed, timestamp, reason, previous value for rollback)

### Admin Feature Toggle Engine Page
- Create `/vp-admin-x7k9/feature-flags` page
- Toggleable features: listing fees, platform fees, withdrawal fees, promo campaigns, AI modules, commission boosts, vendor onboarding mode, affiliate reward programs, ranking algorithms, experiment features
- Each toggle shows: current state, last changed by, timestamp, reason note
- Rollback button to restore previous value

### Revenue & Fee Engine Upgrade
- Extend `AdminRevenueControls.tsx` to include:
  - Micro maintenance fees (processing buffer, withdrawal fee %, flat fee)
  - Verification badge fee
  - Vendor subscription tier configuration
  - Transparent ledger display toggle
- All fee changes logged to `system_logs`

---

## Phase 4: Vendor System + Affiliate Rank Ladder + Certificates

### Vendor Modes (Normal vs Premium)
- Add `vendor_tier` column to `profiles` (`normal` | `premium`)
- Add `is_verified` boolean to `profiles` for verification badges
- Premium benefits: lower platform fee %, better ranking score boost, faster payout queue priority
- Admin can assign vendor tier from Users page

### Vendor Tools Expansion
- Coupon builder (new `vendor_coupons` table)
- Affiliate recruitment tools (shareable vendor profile page)
- Update `VendorAnnouncements.tsx` to trigger:
  - Dashboard feed (already exists)
  - Push notification (via PWA service worker)
  - Product page banner display

### Affiliate Rank Ladder
- New `affiliate_ranks` table defining thresholds:
  - Bronze: 50,000 NGN, Silver: 100,000, Gold: 250,000, Diamond: 500,000, Platinum: 750,000, Elite: 1,000,000+
- Rank computed from `wallets.total_earned`
- Display rank badge on affiliate dashboard and leaderboard
- Rank-based benefits: fee discounts, higher commission tiers, promo boosts

### Certificate System
- New `/dashboard/certificates` page
- Auto-generate certificates on rank milestones
- Certificate design: glassmorphism overlay, metallic gradient title, rank watermark, QR verification code, unique hash ID
- Export as PDF/PNG
- Public verification URL: `/verify-certificate/:id`
- Social share card generation

---

## Phase 5: Advanced Commission Engine + Anti-Fraud + Conversion Intelligence

### Commission Engine Enhancements
- Update `AdminCommissionRules.tsx` to support:
  - 15 sales/week threshold logic
  - Forward-only upgrade (never downgrade mid-period)
  - 1-week grace period before rate expires
  - Recurring commissions for subscription products (new field on products)
- All commission calculations logged to `system_logs` with full breakdown

### Anti-Fraud System Enhancements
- Duplicate click filtering: check IP hash + time window in `track-click` edge function
- Self-referral blocking: validate affiliate_id != buyer in `process-sale`
- Rapid conversion spike detection: AI-powered via `ai-insights` edge function
- Device fingerprint collection (user-agent + screen resolution hash)
- Admin fraud dashboard already exists -- enhance with:
  - Per-event fraud flags inline
  - Commission hold/release toggle per transaction
  - Manual review queue with bulk actions

### Conversion Intelligence Dashboard
- New `/dashboard/analytics` page for affiliates with:
  - Click-to-sale rate per product
  - EPC (earnings per click) calculation
  - Top performing products ranked by conversion
  - Traffic source breakdown (from UTM tags)
  - Funnel visualization (clicks -> visits -> signups -> purchases)
- Leaderboard system (already exists): enhance with daily/weekly/monthly filters

---

## Phase 6: AI Copilot System + Experiment Engine + Final Polish

### AI Admin Copilot
- New `/vp-admin-x7k9/ai-copilot` page
- Two modes:
  - **Advisory Mode**: AI analyzes data and suggests optimizations (uses existing `ai-insights` edge function)
  - **Controlled Auto Mode**: AI executes safe actions only (fraud holds, promo boosts, ranking adjustments)
- Hard guardrails enforced in edge function:
  - Cannot change core fee math
  - Cannot approve large payouts (above configurable threshold)
  - Cannot delete entities
- Decision log table for all AI actions
- Budget caps and margin protection configuration

### Experiment System
- New `experiments` table (name, type, variants, status, created_by)
- Admin can A/B test: commission rates, vendor fees, ranking rules, promo boosts, payout timing
- Flag experiments visibly in admin UI
- Results tracking per variant

### AI Value-Add Modules (Expanded)
- Extend `ai-insights` edge function with new types:
  - `churn_prediction`: analyze affiliate activity patterns
  - `promo_timing`: suggest optimal promotion windows
  - `complaint_sentiment`: analyze support messages
  - `smart_matching`: match affiliates to products based on performance history
- Each module toggleable from `AdminRevenueControls.tsx`

### Marketplace Ranking Engine Enhancements
- Update ranking score calculation to include:
  - Conversion rate weight
  - Refund rate (negative weight)
  - EPC
  - Vendor trust score (based on refund rate + payout history)
  - Affiliate success score (aggregated conversion rates)
  - Sales velocity (recent sales momentum)
- Admin manual override already exists in `AdminRankings.tsx`

---

## Mobile Responsiveness (Applied Across All Phases)

Every page created or modified will follow these rules:
- Responsive grid layouts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Scrollable tables on mobile with horizontal overflow
- Touch-friendly buttons (minimum 44px tap targets)
- Stacked card layouts on mobile instead of tables
- No admin route forces desktop layout
- Mobile header with hamburger menu (already implemented)

---

## Technical Summary

### New Database Tables
- `vendor_coupons` (vendor coupon builder)
- `affiliate_ranks` (rank definitions and thresholds)
- `certificates` (issued certificates with verification)
- `experiments` (A/B test configuration)
- `ai_decisions` (AI copilot action log)

### Modified Tables
- `profiles`: add `vendor_tier`, `is_verified`, `affiliate_rank`
- `products`: add `is_subscription`, `subscription_interval`
- `platform_settings`: extended for feature flags with metadata

### New Pages (approximately 8)
- `/install` (PWA install prompt)
- `/vp-admin-x7k9/feature-flags`
- `/vp-admin-x7k9/ai-copilot`
- `/vp-admin-x7k9/experiments`
- `/dashboard/certificates`
- `/dashboard/analytics` (enhanced affiliate analytics)
- `/verify-certificate/:id` (public verification)

### New/Modified Edge Functions
- `track-click`: duplicate filtering, device fingerprint
- `process-sale`: self-referral blocking, commission rule evaluation
- `ai-insights`: 4 new analysis types
- New `generate-certificate` function

Sometime the admins can decide to be a vendor or an affiliate or both so make sure that anything premium doesnt apply to them they are already premium 

### Dependencies to Add
- `vite-plugin-pwa`
- `html2canvas` or `jspdf` (for certificate PDF generation)
