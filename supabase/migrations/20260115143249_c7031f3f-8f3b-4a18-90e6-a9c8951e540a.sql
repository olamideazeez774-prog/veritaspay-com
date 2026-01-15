-- =============================================
-- HIGH-TRUST AFFILIATE MARKETPLACE - FULL SCHEMA
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'affiliate');

-- 2. Create status enums
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.sale_status AS ENUM ('pending', 'completed', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('sale_commission', 'sale_vendor', 'platform_fee', 'withdrawal', 'refund');
CREATE TYPE public.earning_state AS ENUM ('pending', 'cleared', 'withdrawable');

-- =============================================
-- BASE TABLES
-- =============================================

-- 3. Profiles table (public user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 5. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 30 CHECK (commission_percent >= 5 AND commission_percent <= 90),
  platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 10 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 50),
  refund_window_days INTEGER NOT NULL DEFAULT 7 CHECK (refund_window_days >= 0 AND refund_window_days <= 60),
  cookie_duration_days INTEGER NOT NULL DEFAULT 30 CHECK (cookie_duration_days >= 1 AND cookie_duration_days <= 365),
  status product_status NOT NULL DEFAULT 'draft',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  affiliate_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Delivery options
  file_url TEXT,
  external_url TEXT,
  -- Metadata
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Affiliate links table
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unique_code TEXT NOT NULL UNIQUE,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, product_id)
);

-- 7. Clicks table (for tracking)
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  vendor_id UUID NOT NULL REFERENCES auth.users(id),
  affiliate_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,
  -- Financial breakdown
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  affiliate_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  vendor_earnings DECIMAL(10,2) NOT NULL,
  -- Commission rates at time of sale (immutable)
  commission_percent_snapshot DECIMAL(5,2) NOT NULL,
  platform_fee_percent_snapshot DECIMAL(5,2) NOT NULL,
  -- Status tracking
  status sale_status NOT NULL DEFAULT 'pending',
  refund_eligible_until TIMESTAMPTZ,
  -- Payment info
  payment_reference TEXT,
  payment_gateway TEXT DEFAULT 'paystack',
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  cleared_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cleared_balance >= 0),
  withdrawable_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (withdrawable_balance >= 0),
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Transactions table (audit trail)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id),
  amount DECIMAL(12,2) NOT NULL,
  type transaction_type NOT NULL,
  earning_state earning_state,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Payout requests table
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status payout_status NOT NULL DEFAULT 'pending',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Platform settings table (admin only)
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_status ON public.products(status, is_approved);
CREATE INDEX idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_product ON public.affiliate_links(product_id);
CREATE INDEX idx_affiliate_links_code ON public.affiliate_links(unique_code);
CREATE INDEX idx_clicks_link ON public.clicks(link_id);
CREATE INDEX idx_clicks_created ON public.clicks(created_at);
CREATE INDEX idx_sales_vendor ON public.sales(vendor_id);
CREATE INDEX idx_sales_affiliate ON public.sales(affiliate_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX idx_payout_requests_user ON public.payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Shortcut for checking admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.affiliate_links WHERE unique_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Create wallet for user
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent vendors from approving their own products
CREATE OR REPLACE FUNCTION public.check_product_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change is_approved
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can approve or disapprove products';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_product_approval_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.check_product_approval();

-- Auto-generate affiliate code
CREATE OR REPLACE FUNCTION public.auto_generate_affiliate_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.unique_code IS NULL THEN
    NEW.unique_code := public.generate_affiliate_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_affiliate_code_trigger
  BEFORE INSERT ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_affiliate_code();

-- Update click count on new click
CREATE OR REPLACE FUNCTION public.increment_click_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.affiliate_links
  SET clicks_count = clicks_count + 1
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_click_count_trigger
  AFTER INSERT ON public.clicks
  FOR EACH ROW EXECUTE FUNCTION public.increment_click_count();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- USER_ROLES POLICIES
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- PRODUCTS POLICIES
CREATE POLICY "Anyone can view approved active products"
  ON public.products FOR SELECT
  USING (
    (status = 'active' AND is_approved = true)
    OR vendor_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Vendors can create products"
  ON public.products FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'vendor')
    AND vendor_id = auth.uid()
  );

CREATE POLICY "Vendors can update own products"
  ON public.products FOR UPDATE
  USING (vendor_id = auth.uid() OR public.is_admin());

CREATE POLICY "Vendors can delete own draft products"
  ON public.products FOR DELETE
  USING (
    (vendor_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- AFFILIATE_LINKS POLICIES
CREATE POLICY "Affiliates can view own links"
  ON public.affiliate_links FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());

CREATE POLICY "Affiliates can create links"
  ON public.affiliate_links FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'affiliate')
    AND affiliate_id = auth.uid()
  );

CREATE POLICY "Affiliates can delete own links"
  ON public.affiliate_links FOR DELETE
  USING (affiliate_id = auth.uid());

-- CLICKS POLICIES
CREATE POLICY "Admins can view all clicks"
  ON public.clicks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Anyone can insert clicks"
  ON public.clicks FOR INSERT
  WITH CHECK (true);

-- SALES POLICIES
CREATE POLICY "Users can view related sales"
  ON public.sales FOR SELECT
  USING (
    vendor_id = auth.uid()
    OR affiliate_id = auth.uid()
    OR public.is_admin()
  );

-- Sales are inserted by service role only (edge function)

CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE
  USING (public.is_admin());

-- WALLETS POLICIES
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Wallet updates are service role only

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- Transaction inserts are service role only

-- PAYOUT_REQUESTS POLICIES
CREATE POLICY "Users can view own payout requests"
  ON public.payout_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update payout requests"
  ON public.payout_requests FOR UPDATE
  USING (public.is_admin());

-- PLATFORM_SETTINGS POLICIES
CREATE POLICY "Anyone can view settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.platform_settings FOR ALL
  USING (public.is_admin());

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_percent', '10'::jsonb),
  ('min_commission_percent', '5'::jsonb),
  ('min_withdrawal_amount', '5000'::jsonb),
  ('supported_currencies', '["NGN", "USD"]'::jsonb);