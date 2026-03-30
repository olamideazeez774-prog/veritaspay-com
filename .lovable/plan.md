

# VeritasPay Premium Upgrade -- Complete Implementation Plan

This plan covers the major updates requested: premium certificate redesign, AI Copilot automation, notifications, admin user controls, profile photo uploads, toolkit expansion, verification badge system, and mobile responsiveness fixes.

---

## 1. CERTIFICATE SYSTEM -- Premium Redesign (Major Overhaul)

The current certificates use basic jsPDF text rendering with letter-in-circle badges. This will be completely rebuilt to match the premium reference images.

### Certificate PDF Generator -- Per-Rank Unique Designs

Each rank certificate will be generated as a landscape A4 PDF using `jsPDF` with the following premium elements:

**Shared Structure (all ranks):**
- Gold foil-style double/triple borders drawn with rank-specific colors
- "CERTIFICATE OF ACHIEVEMENT" title in decorative serif style
- Rank name with proper emoji icon (not letter badges)
- "Awarded to" + affiliate name in large script-style font
- Body copy: "In recognition of outstanding performance and verified achievement on VeritasPay, demonstrating exceptional results and commitment to platform excellence."
- Total Verified Earnings amount
- Rank Milestone Achieved date
- CEO signature line with actual admin signature image and "Chief Executive Officer" title (not "Platform Administrator")
- Embossed seal graphic (drawn circle with inner rings and text)
- Certificate ID, Issue Date, and Verification URL in footer
- Profile photo circle frame (if user has avatar_url)

**Rank-Specific Design Table:**

| Rank | Icon | Background | Accent Color | Border Style |
|------|------|-----------|-------------|-------------|
| Bronze | medal emoji | Dark slate #1e293b | Copper #b87333 | Single ornate |
| Silver | medal emoji | Charcoal #374151 | Silver #c0c0c0 | Double border |
| Gold | medal emoji | Deep navy #0f172a | Gold #d4af37 | Triple ornate |
| Diamond | diamond emoji | Black #030712 | Ice blue #93c5fd | Diamond pattern |
| Platinum | Hex shield (drawn) | Dark purple #1e1b4b | Platinum #e5e7eb | Metallic gradient |
| Elite | Crown (drawn) | Pure black #000 | Gold gradient | Double ornate with sparkles |

### Remove Preview Watermark for Production
- Admin certificates in production mode will NOT have the "PREVIEW" watermark
- Preview watermark only appears when `is_preview: true` AND environment is explicitly staging/sandbox
- Since this is production, admin downloads will be clean certificates

### Profile Photo on Certificates
- If user has `avatar_url` in their profile, render it as a circular crop on the certificate (top-right area)
- If no photo, skip the photo frame gracefully

### Rank Icons Update (Everywhere)
Replace letter-in-circle badges across the entire app:
- CertificatesPage.tsx rank ladder cards
- VerifyCertificate.tsx
- Leaderboard
- Dashboard profile display

Mapping:
- Bronze: "&#127949;" 
- Silver: "&#127948;" 
- Gold: "&#127941;"
- Diamond: "&#128142;"
- Platinum: Hex badge (SVG/unicode)
- Elite: "&#128081;"

---

## 2. ADMIN SIGNATURE -- Label Fix

Change the signature label from "Platform Administrator" to the admin's actual full_name + "Chief Executive Officer" on all certificates.

---

## 3. PROFILE PHOTO UPLOAD

### Storage Setup
- Create a `avatars` storage bucket in the backend
- Add RLS policies: users can upload/read their own avatars

### Settings Page Update
- Replace the disabled camera button with a working file upload
- On upload: store in `avatars` bucket, update `profiles.avatar_url`
- Show current photo in the avatar component
- Add image size validation (max 2MB) and type validation (JPEG/PNG only)

### Across the App
- All avatar displays already use `AvatarImage` with `profile.avatar_url` -- once the URL is set, it will show everywhere automatically

---

## 4. DAILY DIGEST -- Fix Visibility

### Problem
The daily digest card shows on the Dashboard but only if data exists. The `generate-daily-digest` edge function exists but must be called. There is no route or nav entry for a dedicated digest page.

### Fix
- Add the daily digest generation to the AI Copilot's auto-cycle (when autonomous mode is ON, run `generate-daily-digest` every cycle as well)
- Add a manual "Generate Digests" button in the AI Copilot Auto Actions tab
- Ensure the Dashboard daily digest card is visible to all roles (admin + vendor + affiliate)

---

## 5. AI COPILOT -- Complete Autonomous Mode

### Current State
The autonomous toggle works with a 60s interval running `autoHoldFraud` and `autoAdjustRankings`. But:
- "Promo Boosts" is disabled with "Coming soon"
- No steward report on toggle-off
- No daily digest trigger

### Updates
- **Enable Promo Boosts**: When auto-mode runs, check `commission_rules` for active promotions and boost eligible products' ranking scores
- **Remove "Coming soon"** from Promo Boosts button -- wire it to actual logic
- **Generate AI Steward Report on Toggle-Off**: When admin disables autonomous mode, generate a summary of all actions taken during the session and display it as a toast/card
- **Include daily digest generation** in the auto-cycle (call the edge function)
- **Add additional auto-actions**: vendor recommendation scoring, onboarding improvement flags

---

## 6. ADMIN USER CONTROLS -- Ban/Suspend/Message

### AdminUsers.tsx Manage Menu Additions
Add to the existing dropdown:
- **Ban User**: Sets `is_banned: true` on profiles, logs to system_logs
- **Temp Suspend**: Sets `suspended_until` timestamp (e.g., 7 days)
- **Send Direct Message**: Opens a dialog to send a message stored in a `user_messages` table
- **Attach Warning Note**: Stores admin note in `admin_notes` column on profiles
- **Fraud Flag**: Manually flag user for fraud review

### Database Changes
- Add `is_banned`, `suspended_until`, `admin_notes` columns to `profiles`
- Create `user_messages` table (from_admin_id, to_user_id, message, created_at, is_read)

### Auth Check
- On login, if `is_banned = true` or `suspended_until > now()`, show error message and prevent access

---

## 7. IN-APP NOTIFICATION CENTER

### Database
- Create `notifications` table (user_id, type, title, body, image_url, cta_url, is_read, created_at)

### Triggers That Create Notifications
Wire real events to insert notifications:
- Sale completed (affiliate + vendor)
- Rank change
- Certificate issued
- Payout processed
- Fraud flag on your account
- New vendor announcement
- Commission earned
- Experiment impact

### UI
- Add bell icon in dashboard header (both mobile and desktop)
- Badge count of unread notifications
- Dropdown/sheet showing recent notifications
- Mark as read on click
- "Mark all as read" button

---

## 8. VENDOR & AFFILIATE TOOLKIT EXPANSION

### Vendor Tools (New tabs in vendor dashboard or separate page)
- **Price A/B Tester**: Simple UI to set two price variants, track which converts better (uses `experiments` table)
- **ROI Calculator**: Input form: product price, commission %, estimated clicks -- outputs projected revenue
- **Scarcity Timer**: Set countdown timer on product pages (store `countdown_end` on products)

### Affiliate Tools (Add to AffiliateToolkit.tsx)
- **Profit Estimator**: Input clicks, conversion rate -- output estimated commission
- **Best Product Today**: AI-powered suggestion using `ai-insights` edge function with `smart_matching` type
- **Caption Generator**: AI-powered social media caption for selected product link
- **Headline Tester**: AI generates 3 headline variants for A/B testing

---

## 9. VERIFICATION BADGE -- Dual Path System

### Earned Path
- Gold+ rank users see "Apply for Verification" button
- Creates entry in a `verification_requests` table (user_id, path: "earned", status: "pending")
- Admin/AI reviews and approves
- On approval: sets `is_verified = true` on profiles

### Paid Path
- Any user can click "Get Verified" and pay the `verification_badge_fee` from platform_settings
- Creates payment record + verification request
- Auto-approved on payment confirmation

### UI
- Add verification section to Settings page
- Show badge status and application flow

---

## 10. FEATURE FLAGS -- Wire to Route Visibility

### Current State
Feature flags exist in `platform_settings` but don't actually hide routes or components.

### Fix
- Create a `useFeatureFlag` hook that reads from `platform_settings`
- Wrap conditional routes/components with feature flag checks
- When flag is OFF: hide nav item + return "Feature disabled" page if accessed directly

---

## 11. MOBILE RESPONSIVENESS FIXES

### AdminAnalytics.tsx
- Calendar popovers: add `side="bottom"` and `align="start"` to prevent viewport overflow
- Stack the "From" and "To" calendars vertically on mobile

### AdminAICopilot.tsx
- Decision log cards: ensure reasoning text wraps properly on mobile (remove `truncate` on mobile)

### AdminRevenueControls.tsx
- "Save All" button: on mobile, make it full-width below the title instead of inline

### AffiliateAnalytics.tsx (Intelligence page)
- Product performance table: convert to card layout on mobile (hide table, show cards below `sm` breakpoint)

### AdminCommissionRules.tsx
- Create dialog: add `max-h-[85vh] overflow-y-auto` to DialogContent
- Stack grid-cols-2 fields to grid-cols-1 on mobile

### AdminExperiments.tsx
- Create dialog: add scrollable wrapper with `max-h-[80vh] overflow-y-auto`

### General
- All Dialog components: ensure `max-h-[85vh] overflow-y-auto` on DialogContent
- Touch targets: verify all buttons are min 44px

---

## 12. CLEANUP

### Remove
- "Coming soon" label from AI Copilot Promo Boosts button
- `as any` type assertions where proper types exist
- Disabled camera button placeholder in Settings (replace with real upload)
- Any remaining non-functional toggles

---

## Technical Summary

### Database Changes (Migration)
- Add columns to `profiles`: `is_banned` (boolean), `suspended_until` (timestamptz), `admin_notes` (text)
- Create `notifications` table
- Create `user_messages` table
- Create `verification_requests` table
- Create `avatars` storage bucket with RLS

### New/Modified Edge Functions
- `generate-daily-digest`: Already exists, will be triggered from AI Copilot auto-cycle

### Modified Pages (approximately 12)
- `CertificatesPage.tsx`: Complete PDF generator rewrite with premium designs
- `VerifyCertificate.tsx`: Enhanced display with rank icons and profile photo
- `AdminAICopilot.tsx`: Full autonomous mode with steward reports
- `AdminUsers.tsx`: Ban/suspend/message controls
- `SettingsPage.tsx`: Profile photo upload + verification badge section
- `AffiliateToolkit.tsx`: AI-powered tools expansion
- `DashboardLayout.tsx`: Notification bell icon
- `AffiliateAnalytics.tsx`: Mobile card layout
- `AdminAnalytics.tsx`: Calendar popover positioning
- `AdminCommissionRules.tsx`: Dialog scrollability
- `AdminExperiments.tsx`: Dialog scrollability
- `AdminRevenueControls.tsx`: Mobile save button positioning

### New Components
- `NotificationCenter`: Bell icon + dropdown with notification list
- `NotificationBell`: Badge with unread count

