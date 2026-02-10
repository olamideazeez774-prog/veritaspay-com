
-- Phase 4: Vendor tiers, affiliate ranks, certificates, vendor coupons

-- 1. Add vendor_tier and is_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vendor_tier text NOT NULL DEFAULT 'normal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Add subscription fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subscription_interval text DEFAULT NULL;

-- 3. Create affiliate_ranks table (static rank definitions)
CREATE TABLE IF NOT EXISTS public.affiliate_ranks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_name text NOT NULL UNIQUE,
  min_earnings numeric NOT NULL DEFAULT 0,
  fee_discount_percent numeric NOT NULL DEFAULT 0,
  commission_boost_percent numeric NOT NULL DEFAULT 0,
  badge_color text NOT NULL DEFAULT '#cd7f32',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ranks" ON public.affiliate_ranks FOR SELECT USING (true);
CREATE POLICY "Only admins can manage ranks" ON public.affiliate_ranks FOR ALL USING (is_admin());

-- Insert default rank ladder
INSERT INTO public.affiliate_ranks (rank_name, min_earnings, fee_discount_percent, commission_boost_percent, badge_color, sort_order)
VALUES
  ('Bronze', 50000, 0, 0, '#cd7f32', 1),
  ('Silver', 100000, 2, 2, '#c0c0c0', 2),
  ('Gold', 250000, 5, 5, '#ffd700', 3),
  ('Diamond', 500000, 8, 8, '#b9f2ff', 4),
  ('Platinum', 750000, 10, 10, '#e5e4e2', 5),
  ('Elite', 1000000, 15, 15, '#ff4500', 6)
ON CONFLICT (rank_name) DO NOTHING;

-- 4. Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  rank_name text NOT NULL,
  certificate_hash text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  verified_count integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Public can verify certificates" ON public.certificates FOR SELECT USING (true);

-- 5. Create vendor_coupons table
CREATE TABLE IF NOT EXISTS public.vendor_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  code text NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage own coupons" ON public.vendor_coupons FOR ALL USING (vendor_id = auth.uid() OR is_admin());
CREATE POLICY "Anyone can view active coupons" ON public.vendor_coupons FOR SELECT USING (is_active = true);

-- 6. Create experiments table
CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  experiment_type text NOT NULL DEFAULT 'commission_rate',
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage experiments" ON public.experiments FOR ALL USING (is_admin());

-- 7. Create ai_decisions table
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_type text NOT NULL,
  action_taken text NOT NULL,
  reasoning text,
  data_snapshot jsonb DEFAULT '{}'::jsonb,
  was_auto boolean NOT NULL DEFAULT false,
  rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view AI decisions" ON public.ai_decisions FOR ALL USING (is_admin());
