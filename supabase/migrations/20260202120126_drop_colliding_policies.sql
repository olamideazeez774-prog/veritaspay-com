-- Repair for fresh environments: the next migration re-CREATEs policies
-- that already exist from earlier migrations (CREATE POLICY is not
-- idempotent). Dropping them first makes the next step idempotent.
-- The live database is unaffected: IF EXISTS is a no-op there.

DROP POLICY IF EXISTS "Vendors can view own listing payments" ON public.product_listing_payments;
DROP POLICY IF EXISTS "Vendors can create listing payments" ON public.product_listing_payments;
DROP POLICY IF EXISTS "Admins can update listing payments" ON public.product_listing_payments;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.platform_referrals;
DROP POLICY IF EXISTS "System can insert referrals" ON public.platform_referrals;
DROP POLICY IF EXISTS "Affiliates can view own referral code" ON public.affiliate_referral_codes;
DROP POLICY IF EXISTS "Affiliates can create own referral code" ON public.affiliate_referral_codes;
DROP POLICY IF EXISTS "Anyone can read codes for verification" ON public.affiliate_referral_codes;
