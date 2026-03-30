-- =============================================
-- PRODUCT DELIVERY SYSTEM MIGRATION
-- Adds delivery tracking and access token system
-- =============================================

-- Add delivery tracking columns to sales table
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS delivery_access_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT, -- 'file_download', 'external_link', 'manual'
  ADD COLUMN IF NOT EXISTS buyer_access_count INTEGER DEFAULT 0;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_sales_delivery_token ON public.sales(delivery_access_token);

-- Create function to generate secure delivery tokens
CREATE OR REPLACE FUNCTION public.generate_delivery_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a secure random token (32 chars, URL-safe)
    new_token := encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM public.sales WHERE delivery_access_token = new_token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  RETURN new_token;
END;
$$;

-- Create function to auto-generate delivery token on sale completion
CREATE OR REPLACE FUNCTION public.auto_generate_delivery_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate token when sale becomes completed
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed' OR NEW.delivery_access_token IS NULL) THEN
    NEW.delivery_access_token := public.generate_delivery_token();
    NEW.delivered_at := NOW();
    
    -- Determine delivery method based on product
    SELECT CASE 
      WHEN p.file_url IS NOT NULL THEN 'file_download'
      WHEN p.external_url IS NOT NULL THEN 'external_link'
      ELSE 'manual'
    END INTO NEW.delivery_method
    FROM public.products p
    WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto token generation
DROP TRIGGER IF EXISTS auto_delivery_token_trigger ON public.sales;
CREATE TRIGGER auto_delivery_token_trigger
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_delivery_token();

-- Also trigger on insert if status is immediately completed
CREATE OR REPLACE FUNCTION public.auto_generate_delivery_token_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.delivery_access_token IS NULL THEN
    NEW.delivery_access_token := public.generate_delivery_token();
    NEW.delivered_at := NOW();
    
    SELECT CASE 
      WHEN p.file_url IS NOT NULL THEN 'file_download'
      WHEN p.external_url IS NOT NULL THEN 'external_link'
      ELSE 'manual'
    END INTO NEW.delivery_method
    FROM public.products p
    WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_delivery_token_insert_trigger ON public.sales;
CREATE TRIGGER auto_delivery_token_insert_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_delivery_token_on_insert();

-- Update RLS policy to allow token-based access (for delivery page)
-- Buyers should be able to view their own sales by email or token
CREATE POLICY "Buyers can view own purchases by email"
  ON public.sales FOR SELECT
  USING (
    buyer_email = auth.jwt() ->> 'email'
    OR vendor_id = auth.uid()
    OR affiliate_id = auth.uid()
    OR public.is_admin()
  );

-- Create delivery_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  access_method TEXT NOT NULL, -- 'email_link', 'direct_token', 'dashboard'
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on delivery_logs
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view delivery logs"
  ON public.delivery_logs FOR SELECT
  USING (public.is_admin());

-- Service role can insert logs
CREATE POLICY "Service role can insert delivery logs"
  ON public.delivery_logs FOR INSERT
  WITH CHECK (true);

-- Create index for sale lookups
CREATE INDEX idx_delivery_logs_sale ON public.delivery_logs(sale_id);

-- Add comment for documentation
COMMENT ON TABLE public.sales IS 'Sales records with delivery tracking via access_token';
COMMENT ON COLUMN public.sales.delivery_access_token IS 'Secure token for buyer to access their purchase without login';
COMMENT ON COLUMN public.sales.buyer_access_count IS 'Number of times buyer has accessed the delivery page';
