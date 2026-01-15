-- Fix security warnings: Add search_path to functions and restrict permissive policy

-- 1. Fix generate_affiliate_code function
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- 2. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Fix auto_generate_affiliate_code function
CREATE OR REPLACE FUNCTION public.auto_generate_affiliate_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.unique_code IS NULL THEN
    NEW.unique_code := public.generate_affiliate_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Drop permissive clicks INSERT policy and create a more restrictive one
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.clicks;

-- Create a function to verify click insertion (will be called from edge function)
CREATE OR REPLACE FUNCTION public.is_valid_click_insert()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clicks should only be inserted by service role or through edge function
  -- For now, allow authenticated users and anon for tracking
  RETURN true;
END;
$$;

-- More restrictive policy - clicks are tracked via edge function using service role
-- This policy allows the edge function to work while preventing direct abuse
CREATE POLICY "Clicks can be inserted for tracking"
  ON public.clicks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affiliate_links al
      JOIN public.products p ON p.id = al.product_id
      WHERE al.id = link_id
      AND p.status = 'active'
      AND p.is_approved = true
    )
  );