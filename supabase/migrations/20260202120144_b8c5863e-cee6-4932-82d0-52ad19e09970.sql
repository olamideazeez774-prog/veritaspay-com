-- Fix the permissive RLS policy on platform_referrals
-- Only allow inserts from edge functions (service role) or authenticated users with proper context
DROP POLICY IF EXISTS "System can insert referrals" ON public.platform_referrals;

-- More restrictive insert policy - only allow if the referred_user_id matches the current auth user
-- This means a user can only create a referral record for themselves (when they sign up)
CREATE POLICY "Referrals can be inserted during signup"
  ON public.platform_referrals
  FOR INSERT
  WITH CHECK (referred_user_id = auth.uid());

-- Drop duplicate select policy if exists
DROP POLICY IF EXISTS "Anyone can read codes for verification" ON public.affiliate_referral_codes;