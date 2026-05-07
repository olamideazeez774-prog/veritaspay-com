ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS business_url text,
  ADD COLUMN IF NOT EXISTS affiliate_membership_expires_at timestamptz;

ALTER TABLE public.vendor_announcements
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS link_url text;

INSERT INTO public.platform_settings (key, value)
VALUES ('verification_fee', jsonb_build_object('amount', 5000))
ON CONFLICT (key) DO NOTHING;

-- Replace handle_new_user so it reads referred_by from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_ref_code text;
  meta_ref_code text;
  meta_brand text;
  ref_user_id uuid;
BEGIN
  new_ref_code := public.generate_profile_referral_code();
  meta_ref_code := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  meta_brand := nullif(NEW.raw_user_meta_data->>'brand_name', '');

  -- Resolve referrer if metadata provided
  IF meta_ref_code <> '' THEN
    SELECT id INTO ref_user_id FROM public.profiles WHERE referral_code = meta_ref_code LIMIT 1;
    IF ref_user_id IS NULL THEN
      SELECT affiliate_id INTO ref_user_id FROM public.affiliate_referral_codes WHERE referral_code = meta_ref_code LIMIT 1;
    END IF;
    IF ref_user_id = NEW.id THEN
      ref_user_id := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by, brand_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_ref_code,
    ref_user_id,
    meta_brand
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.affiliate_referral_codes (affiliate_id, referral_code)
  VALUES (NEW.id, new_ref_code) ON CONFLICT DO NOTHING;

  IF ref_user_id IS NOT NULL THEN
    INSERT INTO public.platform_referrals (referrer_id, referred_user_id, referral_code)
    VALUES (ref_user_id, NEW.id, meta_ref_code)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();