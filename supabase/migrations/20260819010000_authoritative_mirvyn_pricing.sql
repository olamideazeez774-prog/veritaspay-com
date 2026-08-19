-- Authoritative MIRVYN pricing policy.
-- This migration supersedes legacy 10%/15% listing-model and percentage-payout logic.

-- All products use a 5% platform commission; no waiver pricing remains.
UPDATE public.products
SET platform_fee_percent = 5,
    listing_model = 'standard'
WHERE platform_fee_percent IS DISTINCT FROM 5 OR listing_model IS DISTINCT FROM 'standard';

CREATE OR REPLACE FUNCTION public.enforce_listing_model_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.listing_model := 'standard';
  NEW.platform_fee_percent := 5;
  RETURN NEW;
END;
$$;

-- Migrate the previous processing-fee vocabulary to the current business model.
UPDATE public.products SET payment_processing_fee_bearer = 'vendor' WHERE payment_processing_fee_bearer = 'customer';
UPDATE public.products SET payment_processing_fee_bearer = 'vendor_affiliate_split_50_50' WHERE payment_processing_fee_bearer = 'split_50_50';
UPDATE public.sales SET payment_processing_fee_bearer = 'vendor' WHERE payment_processing_fee_bearer = 'customer';
UPDATE public.sales SET payment_processing_fee_bearer = 'vendor_affiliate_split_50_50' WHERE payment_processing_fee_bearer = 'split_50_50';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_payment_processing_fee_bearer_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_payment_processing_fee_bearer_check
  CHECK (payment_processing_fee_bearer IN ('vendor', 'vendor_affiliate_split_50_50'));

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_processing_fee_bearer_check;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_processing_fee_bearer_check
  CHECK (payment_processing_fee_bearer IN ('vendor', 'vendor_affiliate_split_50_50'));

ALTER TABLE public.products ALTER COLUMN payment_processing_fee_bearer SET DEFAULT 'vendor';
ALTER TABLE public.sales ALTER COLUMN payment_processing_fee_bearer SET DEFAULT 'vendor';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS affiliate_processing_fee_kobo bigint NOT NULL DEFAULT 0;

ALTER TABLE public.pending_payments
  ADD COLUMN IF NOT EXISTS affiliate_processing_fee_kobo bigint NOT NULL DEFAULT 0;

-- Replace the legacy percentage-based helper with the agreed fixed fee tiers.
CREATE OR REPLACE FUNCTION public.compute_withdrawal_fee(_amount numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _amount < 3500 THEN 0
    WHEN _amount <= 9999 THEN 50
    WHEN _amount <= 20000 THEN 100
    WHEN _amount <= 50000 THEN 150
    WHEN _amount <= 100000 THEN 200
    WHEN _amount <= 500000 THEN 300
    WHEN _amount <= 1000000 THEN 400
    ELSE 500
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_payout_request_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet record;
  _feature_flags jsonb := '{}'::jsonb;
  _withdrawal_fees_enabled boolean := true;
  _is_admin_user boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.amount IS NULL OR NEW.amount < 3500 THEN
      RAISE EXCEPTION 'Minimum withdrawal amount is 3500 NGN';
    END IF;

    SELECT id, user_id, withdrawable_balance
    INTO _wallet
    FROM public.wallets
    WHERE id = NEW.wallet_id
    FOR UPDATE;

    IF _wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
    IF _wallet.user_id IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Payout wallet does not belong to this user'; END IF;
    IF NEW.amount > _wallet.withdrawable_balance THEN RAISE EXCEPTION 'Insufficient withdrawable balance'; END IF;

    SELECT COALESCE(value, '{}'::jsonb) INTO _feature_flags
    FROM public.platform_settings WHERE key = 'feature_flags' LIMIT 1;
    _withdrawal_fees_enabled := COALESCE((_feature_flags -> 'withdrawal_fees' ->> 'enabled')::boolean, true);
    _is_admin_user := public.has_role(NEW.user_id, 'admin'::app_role);

    -- Ignore client-supplied fee_amount/net_amount. The server owns both values.
    NEW.fee_amount := CASE WHEN _is_admin_user OR NOT _withdrawal_fees_enabled THEN 0 ELSE public.compute_withdrawal_fee(NEW.amount) END;
    NEW.net_amount := GREATEST(0, NEW.amount - NEW.fee_amount);
    NEW.hold_until := COALESCE(NEW.hold_until, now() + interval '12 hours');
    NEW.status := COALESCE(NEW.status, 'pending'::payout_status);

    UPDATE public.wallets SET withdrawable_balance = withdrawable_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
    NEW.funds_reserved := true;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.funds_reserved = true AND NEW.status = 'rejected'::payout_status AND OLD.status IS DISTINCT FROM 'rejected'::payout_status THEN
      UPDATE public.wallets SET withdrawable_balance = withdrawable_balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
      NEW.funds_reserved := false;
    END IF;
    IF NEW.status = 'paid'::payout_status AND OLD.status IS DISTINCT FROM 'paid'::payout_status THEN
      UPDATE public.wallets SET total_withdrawn = total_withdrawn + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Required pricing controls must be enabled; the server still enforces the rules.
UPDATE public.platform_settings
SET value = jsonb_set(
  jsonb_set(COALESCE(value, '{}'::jsonb), '{listing_fees}', '{"enabled": true}'::jsonb, true),
  '{withdrawal_fees}', '{"enabled": true}'::jsonb, true
),
updated_at = now()
WHERE key = 'feature_flags';

INSERT INTO public.platform_settings (key, value)
VALUES
  ('platform_fee_percent', '5'::jsonb),
  ('min_withdrawal_amount', '3500'::jsonb),
  ('affiliate_membership_fee', '{"amount": 350, "interval": "month"}'::jsonb),
  ('product_listing_fee', '{"amount": 2000, "interval": "one_time"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
