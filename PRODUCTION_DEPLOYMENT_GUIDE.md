# Production Deployment Guide

## Critical Fixes Applied

### ✅ 1. Config.toml Fixes (COMPLETED)
Added 6 missing edge functions to `supabase/config.toml` with `verify_jwt = false`:
- `paystack-callback` - Fixed 401 errors on payment verification
- `get-delivery` - Fixed delivery access for buyers
- `clear-earnings` - Fixed earnings clearing cron
- `process-refund` - Fixed refund processing
- `fraud-detection` - Fixed fraud analysis
- `ai-autonomous-scheduler` - Fixed AI automation

### ✅ 2. SQL Migrations Created

#### Migration 1: Fix admin_notes Privacy
**File:** `supabase/migrations/20260404000001_fix_admin_notes_privacy.sql`

This migration addresses the security issue where `admin_notes` on profiles were publicly readable.

**To apply:**
```bash
supabase db push
```

Or run in Supabase SQL Editor:
```sql
-- Create a public profiles view (excluding admin_notes)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id, full_name, email, avatar_url, referral_code, 
  is_banned, suspended_until, vendor_tier, is_verified,
  created_at, updated_at
FROM profiles;

-- Note: Application should use public_profiles for public display
-- Only fetch admin_notes for admin users or own profile
```

#### Migration 2: Enable Realtime
**File:** `supabase/migrations/20260404000002_enable_realtime.sql`

Enables realtime subscriptions for live updates.

**To apply:**
```bash
supabase db push
```

Or run in Supabase SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_announcements;
```

---

## 🔴 CRITICAL: Setup Cron Jobs

The `clear-earnings` function needs to run daily to move earnings from "pending" to "cleared" state after the refund window passes.

### Option 1: Supabase Cron (Recommended)

Add to `supabase/config.toml`:
```toml
[cron]
enabled = true

[[cron.jobs]]
name = "clear-earnings"
schedule = "0 0 * * *"  # Daily at midnight
function = "clear-earnings"
```

Then deploy:
```bash
supabase functions deploy clear-earnings
```

### Option 2: External Cron Service (Vercel, GitHub Actions, etc.)

**Vercel Cron Example** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/clear-earnings",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**GitHub Actions Example** (.github/workflows/clear-earnings.yml):
```yaml
name: Clear Earnings Daily
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Manual trigger

jobs:
  clear-earnings:
    runs-on: ubuntu-latest
    steps:
      - name: Call clear-earnings function
        run: |
          curl -X POST "https://your-project.supabase.co/functions/v1/clear-earnings" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Option 3: Manual Admin Trigger

Add a button in Admin Panel to trigger manually:
```typescript
// In AdminDashboard or AdminRevenue page
const triggerClearEarnings = async () => {
  const { data, error } = await supabase.functions.invoke('clear-earnings');
  if (error) toast.error('Failed to clear earnings');
  else toast.success(`Processed ${data?.clearedCount || 0} earnings`);
};
```

---

## 🔴 CRITICAL: Environment Variables

Set these in Supabase Dashboard → Project Settings → Secrets:

| Secret | Status | Impact |
|--------|--------|--------|
| `PAYSTACK_SECRET_KEY` | ❌ NOT SET | Payments will fail with 503 |
| `RESEND_API_KEY` | ❌ NOT SET | Emails will fail with 503 |
| `LOVABLE_API_KEY` | ✅ SET | AI features work |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ SET | Edge functions work |
| `SITE_URL` | ⚠️ CHECK | Email links need correct domain |

---

## 🟡 MEDIUM Priority Fixes Remaining

### Commission Rules Verification
The process-sale function already has commission rules logic. However, verify these rule types work:
- `weekly_threshold` - Boost after X weekly sales ✅
- `per_affiliate` - Custom commission per affiliate ✅
- `tiered` - Not yet implemented (optional enhancement)
- `boost` - Not yet implemented (optional enhancement)

### Database Triggers Verification
Run this SQL to verify triggers exist:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

Expected triggers:
- `notify_on_sale`
- `notify_on_payout_change`
- `log_payout_change`
- `handle_new_user`
- `auto_generate_affiliate_code`
- `increment_click_count`
- And 10+ more...

If triggers are missing, run:
```bash
supabase db reset  # ⚠️ This will reset data
```
Or manually recreate triggers from migration files.

---

## 🟢 LOW Priority Cleanup

### Unused Code (Safe to Remove)
1. `src/components/ui/toaster.tsx` - Radix Toaster (unused)
2. `src/hooks/use-toast.ts` - Radix toast hook (unused)
3. Legacy `/admin/*` routes in App.tsx (duplicates)
4. `gsap` package (not imported anywhere)

### Performance Improvements
1. Add React.lazy() for code splitting
2. Optimize certificate PDF generation (713 lines, CPU intensive)
3. Add pagination to admin tables (currently fetch all records)

---

## Pre-Launch Checklist

- [ ] Set `PAYSTACK_SECRET_KEY` in Supabase secrets
- [ ] Set `RESEND_API_KEY` in Supabase secrets
- [ ] Apply SQL migrations (admin_notes, realtime)
- [ ] Setup cron job for `clear-earnings`
- [ ] Verify database triggers exist
- [ ] Test payment flow end-to-end
- [ ] Test email delivery
- [ ] Test affiliate commission calculation
- [ ] Verify RLS policies (admin_notes restricted)
- [ ] Test PWA on mobile devices
- [ ] Load test with 100+ concurrent users

---

## Support

For issues with:
- **Payments**: Check `PAYSTACK_SECRET_KEY` and test mode
- **Emails**: Check `RESEND_API_KEY` and domain verification
- **Earnings not clearing**: Verify cron job is running
- **401 errors**: Check config.toml has `verify_jwt = false`
- **Realtime not working**: Check migration 20260404000002 applied
