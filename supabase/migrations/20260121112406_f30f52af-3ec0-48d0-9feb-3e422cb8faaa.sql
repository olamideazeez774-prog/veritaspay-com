-- Create function to increment conversion count on affiliate links
CREATE OR REPLACE FUNCTION public.increment_conversion_count(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.affiliate_links
  SET conversions_count = conversions_count + 1
  WHERE id = link_id;
END;
$$;

-- Allow the sales table to be inserted via service role (edge functions)
-- This is already handled by the existing structure, but ensure proper constraints

-- Create a function for incrementing wallet balances safely
CREATE OR REPLACE FUNCTION public.increment_pending_balance(_wallet_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET 
    pending_balance = pending_balance + _amount,
    total_earned = total_earned + _amount,
    updated_at = now()
  WHERE id = _wallet_id;
END;
$$;

-- Create function to clear earnings (move from pending to cleared after refund window)
CREATE OR REPLACE FUNCTION public.clear_earning(_wallet_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET 
    pending_balance = pending_balance - _amount,
    cleared_balance = cleared_balance + _amount,
    withdrawable_balance = withdrawable_balance + _amount,
    updated_at = now()
  WHERE id = _wallet_id;
END;
$$;