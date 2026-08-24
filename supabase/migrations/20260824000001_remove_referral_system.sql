-- Drop platform referrals table
DROP TABLE IF EXISTS public.platform_referrals CASCADE;

-- Drop legacy affiliate referral codes table
DROP TABLE IF EXISTS public.affiliate_referral_codes CASCADE;

-- Drop referral-related functions
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_profile_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.record_platform_referral(uuid, uuid, text) CASCADE;

-- Remove referral fields from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS referral_code CASCADE;

-- Remove second tier commission fields from sales
ALTER TABLE public.sales
  DROP COLUMN IF EXISTS second_tier_affiliate_id CASCADE,
  DROP COLUMN IF EXISTS second_tier_commission CASCADE;

-- Remove second tier commission fields from products
ALTER TABLE public.products
  DROP COLUMN IF EXISTS second_tier_commission_percent CASCADE;
