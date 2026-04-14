-- Critical fixes for race conditions, data integrity, and performance

-- ============================================
-- 1. ATOMIC WALLET TRANSACTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_wallet_transaction(
  _wallet_id UUID,
  _sale_id UUID,
  _amount NUMERIC,
  _type TEXT,
  _description TEXT
) RETURNS VOID AS $$
BEGIN
  -- Insert transaction record
  INSERT INTO transactions (wallet_id, sale_id, amount, type, earning_state, description, created_at)
  VALUES (_wallet_id, _sale_id, _amount, _type, 'pending', _description, NOW());
  
  -- Atomically increment wallet balances
  UPDATE wallets 
  SET 
    pending_balance = pending_balance + _amount,
    total_earned = CASE 
      WHEN _type IN ('sale_vendor', 'sale_commission', 'second_tier_commission') 
      THEN total_earned + _amount 
      ELSE total_earned 
    END,
    updated_at = NOW()
  WHERE id = _wallet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found: %', _wallet_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. ATOMIC COUPON USAGE INCREMENT
-- ============================================
CREATE OR REPLACE FUNCTION increment_coupon_usage(_coupon_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE vendor_coupons 
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = _coupon_id
  RETURNING current_uses INTO new_count;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon not found: %', _coupon_id;
  END IF;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. ATOMIC CONVERSION COUNT INCREMENT
-- ============================================
CREATE OR REPLACE FUNCTION increment_conversion_count(_link_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliate_links 
  SET conversion_count = conversion_count + 1,
      updated_at = NOW()
  WHERE id = _link_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate link not found: %', _link_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. DATABASE INDEXES FOR PERFORMANCE
-- ============================================

-- Sales table indexes
CREATE INDEX IF NOT EXISTS idx_sales_affiliate_id ON sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_sales_vendor_id ON sales(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_affiliate_status ON sales(affiliate_id, status);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sale_id ON transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_earning_state ON transactions(earning_state);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Wallets table indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_listed ON products(is_listed);

-- Affiliate links indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);

-- Payout requests indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- Platform referrals indexes
CREATE INDEX IF NOT EXISTS idx_platform_referrals_referrer_id ON platform_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_platform_referrals_referred_id ON platform_referrals(referred_user_id);

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_rank_name ON certificates(rank_name);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================
-- 5. ADD VALIDATION CONSTRAINTS
-- ============================================

-- Ensure commission percent is within valid range
ALTER TABLE products 
ADD CONSTRAINT chk_commission_percent_range 
CHECK (commission_percent >= 35 AND commission_percent <= 90);

-- Ensure platform fee is non-negative and reasonable
ALTER TABLE products 
ADD CONSTRAINT chk_platform_fee_percent 
CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 50);

-- Ensure prices are positive
ALTER TABLE products 
ADD CONSTRAINT chk_price_positive 
CHECK (price > 0);

-- ============================================
-- 6. CREATE RLS POLICY HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns the record
CREATE OR REPLACE FUNCTION is_owner(_user_id UUID, _owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN _user_id = _owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
