
-- ============================================================
-- 1. DROP DUPLICATE TRIGGERS (keep canonical trg_* names)
-- ============================================================

-- sales: keep trg_log_sale_change, trg_notify_on_sale
DROP TRIGGER IF EXISTS on_sale_log ON public.sales;
DROP TRIGGER IF EXISTS on_sale_change_log ON public.sales;
DROP TRIGGER IF EXISTS on_sale_notify ON public.sales;

-- products: keep trg_log_product_change, check_product_approval_trigger
DROP TRIGGER IF EXISTS on_product_log ON public.products;
DROP TRIGGER IF EXISTS on_product_change_log ON public.products;
DROP TRIGGER IF EXISTS check_product_approval ON public.products;
DROP TRIGGER IF EXISTS on_product_approval_check ON public.products;

-- payout_requests: keep trg_log_payout_change, trg_notify_on_payout_change
DROP TRIGGER IF EXISTS on_payout_log ON public.payout_requests;
DROP TRIGGER IF EXISTS on_payout_change_notify ON public.payout_requests;
DROP TRIGGER IF EXISTS on_payout_notify ON public.payout_requests;

-- product_listing_payments: keep trg_log_listing_payment_change
DROP TRIGGER IF EXISTS on_listing_payment_log ON public.product_listing_payments;

-- profiles: keep trg_log_new_profile, on_profile_created (handle_new_user is on auth)
DROP TRIGGER IF EXISTS on_new_profile_log ON public.profiles;
DROP TRIGGER IF EXISTS auto_gen_referral_code ON public.profiles;

-- certificates: keep trg_notify_on_certificate
DROP TRIGGER IF EXISTS on_certificate_issued ON public.certificates;
DROP TRIGGER IF EXISTS on_certificate_notify ON public.certificates;

-- clicks: keep increment_click_count_trigger
DROP TRIGGER IF EXISTS on_click_increment ON public.clicks;

-- user_roles: keep trg_log_role_change, check_role_duplicate
DROP TRIGGER IF EXISTS on_role_change ON public.user_roles;
DROP TRIGGER IF EXISTS on_role_change_log ON public.user_roles;
DROP TRIGGER IF EXISTS check_role_before_insert ON public.user_roles;

-- vendor_announcements: keep trg_notify_on_announcement
DROP TRIGGER IF EXISTS on_announcement_notify ON public.vendor_announcements;
DROP TRIGGER IF EXISTS on_announcement_publish ON public.vendor_announcements;

-- verification_requests: keep trg_notify_on_verification
DROP TRIGGER IF EXISTS on_verification_update ON public.verification_requests;
DROP TRIGGER IF EXISTS on_verification_update_notify ON public.verification_requests;

-- user_messages: keep trg_notify_on_admin_message
DROP TRIGGER IF EXISTS on_admin_message ON public.user_messages;
DROP TRIGGER IF EXISTS on_admin_message_notify ON public.user_messages;

-- affiliate_links: keep auto_generate_affiliate_code_trigger
DROP TRIGGER IF EXISTS auto_gen_affiliate_code ON public.affiliate_links;

-- affiliate_referral_codes: keep auto_referral_code_trigger (one copy)
DROP TRIGGER IF EXISTS auto_gen_referral_code ON public.affiliate_referral_codes;
-- The second auto_referral_code_trigger duplicate (same name) cannot both exist;
-- recreate cleanly to ensure single trigger
DROP TRIGGER IF EXISTS auto_referral_code_trigger ON public.affiliate_referral_codes;
CREATE TRIGGER auto_referral_code_trigger
  BEFORE INSERT ON public.affiliate_referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();

-- transactions: keep trg_log_transaction
DROP TRIGGER IF EXISTS on_transaction_log ON public.transactions;

-- ============================================================
-- 2. FIX PROFILES PII EXPOSURE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Public-safe view exposing only non-sensitive columns for cross-user lookups
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  referral_code,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
