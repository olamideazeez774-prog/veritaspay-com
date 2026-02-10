
-- Phase 1: Fix referral system - ensure every user gets a referral code

-- 1. Add referral_code column to profiles (auto-generated for ALL users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;

-- 2. Create function to generate unique profile referral codes
CREATE OR REPLACE FUNCTION public.generate_profile_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'VP' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE referral_code = new_code
      UNION ALL
      SELECT 1 FROM public.affiliate_referral_codes WHERE referral_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$function$;

-- 3. Update handle_new_user to auto-assign referral_code on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_ref_code TEXT;
BEGIN
  new_ref_code := public.generate_profile_referral_code();
  
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_ref_code
  );
  
  -- Create wallet for user
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  -- Also insert into affiliate_referral_codes so legacy queries work
  INSERT INTO public.affiliate_referral_codes (affiliate_id, referral_code)
  VALUES (NEW.id, new_ref_code)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 4. Backfill existing profiles that have NULL or empty referral_code
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE referral_code IS NULL OR referral_code = '' LOOP
    new_code := public.generate_profile_referral_code();
    UPDATE public.profiles SET referral_code = new_code WHERE id = rec.id;
    -- Also upsert into affiliate_referral_codes
    INSERT INTO public.affiliate_referral_codes (affiliate_id, referral_code)
    VALUES (rec.id, new_code)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 5. Backfill affiliate_referral_codes with empty codes
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
BEGIN
  FOR rec IN SELECT id, affiliate_id FROM public.affiliate_referral_codes WHERE referral_code IS NULL OR referral_code = '' OR referral_code = 'TEMP' LOOP
    -- Use the profile's code if it exists
    SELECT referral_code INTO new_code FROM public.profiles WHERE id = rec.affiliate_id AND referral_code IS NOT NULL AND referral_code != '';
    IF new_code IS NULL THEN
      new_code := public.generate_profile_referral_code();
    END IF;
    UPDATE public.affiliate_referral_codes SET referral_code = new_code WHERE id = rec.id;
  END LOOP;
END $$;

-- 6. Add unique constraint on profiles.referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;

-- 7. Update platform_referrals RLS to also allow service role inserts (for edge functions)
-- The existing policy requires referred_user_id = auth.uid(), which won't work during signup 
-- because the user might not be authenticated yet when the referral is recorded.
-- Add a permissive policy for authenticated users to insert their own referrals
