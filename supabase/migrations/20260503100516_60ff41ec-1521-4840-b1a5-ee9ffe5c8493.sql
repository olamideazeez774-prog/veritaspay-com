-- 1. Vendor plans
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vendor_plan text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS onboarding_balance_due numeric NOT NULL DEFAULT 0;

-- 2. Per-product listing model
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS listing_model text NOT NULL DEFAULT 'standard';

-- Enforce platform_fee_percent matches listing_model on insert/update
CREATE OR REPLACE FUNCTION public.enforce_listing_model_fee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.listing_model = 'waiver' THEN
    NEW.platform_fee_percent := 15;
  ELSIF NEW.listing_model = 'standard' THEN
    NEW.platform_fee_percent := 10;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_listing_model_fee ON public.products;
CREATE TRIGGER trg_enforce_listing_model_fee
BEFORE INSERT OR UPDATE OF listing_model ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_model_fee();

-- 3. Payout request enhancements (auto-payouts + 12h hold)
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS hold_until timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  ADD COLUMN IF NOT EXISTS fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_code text,
  ADD COLUMN IF NOT EXISTS transfer_status text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS auto_processed boolean NOT NULL DEFAULT false;

-- 4. Onboarding deduction RPC (Starter plan: deduct from first sales until paid)
CREATE OR REPLACE FUNCTION public.deduct_onboarding_balance(_vendor_id uuid, _max_deduction numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _due numeric;
  _take numeric;
BEGIN
  SELECT onboarding_balance_due INTO _due FROM public.profiles WHERE id = _vendor_id;
  IF _due IS NULL OR _due <= 0 THEN RETURN 0; END IF;
  _take := LEAST(_due, _max_deduction);
  UPDATE public.profiles SET onboarding_balance_due = onboarding_balance_due - _take WHERE id = _vendor_id;
  RETURN _take;
END;
$$;

-- 5. Atomic coupon increment (if missing)
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.vendor_coupons SET current_uses = current_uses + 1 WHERE id = coupon_id;
$$;

-- 6. Wallet transaction RPC (atomic) used by process-sale
CREATE OR REPLACE FUNCTION public.create_wallet_transaction(
  _wallet_id uuid, _sale_id uuid, _amount numeric, _type text, _description text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.transactions (wallet_id, sale_id, amount, type, description, earning_state)
  VALUES (_wallet_id, _sale_id, _amount, _type::transaction_type, _description, 'pending'::earning_state);
  UPDATE public.wallets
    SET pending_balance = pending_balance + _amount,
        total_earned = total_earned + _amount,
        updated_at = now()
    WHERE id = _wallet_id;
END;
$$;

-- 7. Tiered withdrawal fee
CREATE OR REPLACE FUNCTION public.compute_withdrawal_fee(_amount numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _amount >= 20000 THEN ROUND(_amount * 0.02) ELSE ROUND(_amount * 0.03) END;
$$;