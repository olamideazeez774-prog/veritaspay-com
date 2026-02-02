-- Add referred_by column to profiles for platform referral tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Create product_listing_payments table to track vendor payments for product listings
CREATE TABLE IF NOT EXISTS public.product_listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_reference text NOT NULL,
  payment_gateway text DEFAULT 'paystack',
  business_name text,
  business_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on product_listing_payments
ALTER TABLE public.product_listing_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_listing_payments
CREATE POLICY "Vendors can view own listing payments"
  ON public.product_listing_payments
  FOR SELECT
  USING (vendor_id = auth.uid() OR public.is_admin());

CREATE POLICY "Vendors can create listing payments"
  ON public.product_listing_payments
  FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Admins can update listing payments"
  ON public.product_listing_payments
  FOR UPDATE
  USING (public.is_admin());

-- Create platform_referrals table to track user sign-ups from affiliate links
CREATE TABLE IF NOT EXISTS public.platform_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL,
  commission_paid boolean DEFAULT false,
  commission_amount numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on platform_referrals
ALTER TABLE public.platform_referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_referrals
CREATE POLICY "Users can view own referrals"
  ON public.platform_referrals
  FOR SELECT
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "System can insert referrals"
  ON public.platform_referrals
  FOR INSERT
  WITH CHECK (true);

-- Create affiliate_referral_codes table for platform-wide referral codes
CREATE TABLE IF NOT EXISTS public.affiliate_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Affiliates can view own referral code"
  ON public.affiliate_referral_codes
  FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());

CREATE POLICY "Affiliates can create own referral code"
  ON public.affiliate_referral_codes
  FOR INSERT
  WITH CHECK (affiliate_id = auth.uid() AND public.has_role(auth.uid(), 'affiliate'));

CREATE POLICY "Anyone can read codes for verification"
  ON public.affiliate_referral_codes
  FOR SELECT
  USING (true);

-- Add second_tier_commission_percent to products (commission for referred vendors' sales)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS second_tier_commission_percent numeric DEFAULT 5;

-- Add second_tier_affiliate_id to sales (the affiliate who referred the vendor)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS second_tier_affiliate_id uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS second_tier_commission numeric DEFAULT 0;

-- Create trigger to auto-update updated_at on product_listing_payments
CREATE TRIGGER update_product_listing_payments_updated_at
  BEFORE UPDATE ON public.product_listing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate platform referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'VP' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.affiliate_referral_codes WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate referral code
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_referral_code_trigger
  BEFORE INSERT ON public.affiliate_referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_listing_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_referrals;