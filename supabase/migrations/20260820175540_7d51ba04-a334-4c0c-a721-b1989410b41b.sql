-- Launch integrity hardening.
-- This migration intentionally does not change pricing, commission, onboarding,
-- listing, subscription, minimum-withdrawal, or withdrawal-fee rules.

ALTER TABLE public.pending_payments
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id uuid REFERENCES public.transactions(id);

CREATE UNIQUE INDEX IF NOT EXISTS sales_payment_reference_unique
  ON public.sales (payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reversal_source_unique
  ON public.transactions (reversal_of_transaction_id)
  WHERE reversal_of_transaction_id IS NOT NULL;

-- Atomic sale insertion plus all wallet credits. A duplicate payment reference
-- returns the existing sale and never credits wallets a second time.
CREATE OR REPLACE FUNCTION public.create_verified_sale(
  _product_id uuid,
  _vendor_id uuid,
  _affiliate_id uuid,
  _second_tier_affiliate_id uuid,
  _buyer_email text,
  _total_amount numeric,
  _platform_fee numeric,
  _affiliate_commission numeric,
  _second_tier_commission numeric,
  _vendor_earnings_before_onboarding numeric,
  _commission_percent_snapshot numeric,
  _platform_fee_percent_snapshot numeric,
  _refund_eligible_until timestamptz,
  _delivery_access_token text,
  _payment_reference text,
  _payment_gateway text,
  _payment_processing_fee_bearer text,
  _required_amount_kobo bigint,
  _received_amount_kobo bigint,
  _paystack_transaction_id bigint,
  _paystack_fee_kobo bigint,
  _customer_processing_fee_kobo bigint,
  _vendor_processing_fee_kobo bigint,
  _affiliate_processing_fee_kobo bigint,
  _product_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_id uuid;
  _created boolean := false;
  _wallet_id uuid;
  _vendor_earnings numeric;
  _onboarding_deducted numeric := 0;
BEGIN
  IF _payment_reference IS NULL OR length(trim(_payment_reference)) = 0 THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  _vendor_earnings := GREATEST(COALESCE(_vendor_earnings_before_onboarding, 0), 0);
  SELECT LEAST(1100, _vendor_earnings, GREATEST(COALESCE(onboarding_balance_due, 0), 0))
  INTO _onboarding_deducted
  FROM public.profiles
  WHERE id = _vendor_id
  FOR UPDATE;
  _onboarding_deducted := COALESCE(_onboarding_deducted, 0);
  IF _onboarding_deducted > 0 THEN
    UPDATE public.profiles
    SET onboarding_balance_due = onboarding_balance_due - _onboarding_deducted,
        updated_at = now()
    WHERE id = _vendor_id;
    _vendor_earnings := _vendor_earnings - _onboarding_deducted;
  END IF;

  INSERT INTO public.sales (
    product_id, vendor_id, affiliate_id, second_tier_affiliate_id,
    buyer_email, total_amount, platform_fee, affiliate_commission,
    second_tier_commission, vendor_earnings, commission_percent_snapshot,
    platform_fee_percent_snapshot, status, refund_eligible_until,
    delivery_access_token, payment_reference, payment_gateway,
    payment_processing_fee_bearer, required_amount_kobo, received_amount_kobo,
    paystack_transaction_id, paystack_fee_kobo, customer_processing_fee_kobo,
    vendor_processing_fee_kobo, affiliate_processing_fee_kobo
  ) VALUES (
    _product_id, _vendor_id, _affiliate_id, _second_tier_affiliate_id,
    lower(trim(_buyer_email)), _total_amount, _platform_fee, _affiliate_commission,
    _second_tier_commission, _vendor_earnings, _commission_percent_snapshot,
    _platform_fee_percent_snapshot, 'completed', _refund_eligible_until,
    _delivery_access_token, _payment_reference, COALESCE(_payment_gateway, 'paystack'),
    COALESCE(_payment_processing_fee_bearer, 'vendor'), _required_amount_kobo,
    _received_amount_kobo, _paystack_transaction_id, COALESCE(_paystack_fee_kobo, 0),
    COALESCE(_customer_processing_fee_kobo, 0), COALESCE(_vendor_processing_fee_kobo, 0),
    COALESCE(_affiliate_processing_fee_kobo, 0)
  )
  ON CONFLICT (payment_reference) DO NOTHING
  RETURNING id INTO _sale_id;

  IF _sale_id IS NULL THEN
    SELECT id INTO _sale_id
    FROM public.sales
    WHERE payment_reference = _payment_reference
    LIMIT 1;
    RETURN jsonb_build_object('sale_id', _sale_id, 'created', false);
  END IF;

  _created := true;

  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _vendor_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Vendor wallet not found';
  END IF;
  IF COALESCE(_vendor_earnings, 0) > 0 THEN
    PERFORM public.create_wallet_transaction(
      _wallet_id, _sale_id, _vendor_earnings, 'sale_vendor',
      'Sale of ' || COALESCE(_product_title, 'product')
    );
  END IF;

  IF _affiliate_id IS NOT NULL AND COALESCE(_affiliate_commission, 0) > 0 THEN
    SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _affiliate_id FOR UPDATE;
    IF _wallet_id IS NULL THEN RAISE EXCEPTION 'Affiliate wallet not found'; END IF;
    PERFORM public.create_wallet_transaction(
      _wallet_id, _sale_id, _affiliate_commission, 'sale_commission',
      'Commission from ' || COALESCE(_product_title, 'product')
    );
  END IF;

  IF _second_tier_affiliate_id IS NOT NULL AND COALESCE(_second_tier_commission, 0) > 0 THEN
    SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _second_tier_affiliate_id FOR UPDATE;
    IF _wallet_id IS NULL THEN RAISE EXCEPTION 'Second-tier affiliate wallet not found'; END IF;
    PERFORM public.create_wallet_transaction(
      _wallet_id, _sale_id, _second_tier_commission, 'sale_commission',
      'Second-tier commission from ' || COALESCE(_product_title, 'product')
    );
  END IF;

  RETURN jsonb_build_object('sale_id', _sale_id, 'created', _created, 'vendor_earnings', _vendor_earnings, 'onboarding_deducted', _onboarding_deducted);
END;
$$;

REVOKE ALL ON FUNCTION public.create_verified_sale(
  uuid, uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, timestamptz, text, text, text, text, bigint, bigint, bigint,
  bigint, bigint, bigint, bigint, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_verified_sale(
  uuid, uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, timestamptz, text, text, text, text, bigint, bigint, bigint,
  bigint, bigint, bigint, bigint, text
) TO service_role;

-- Atomic refund claim and wallet reversal. The sale status claim, wallet
-- debits, and reversal rows commit together or roll back together. This does
-- not change refund amounts or eligibility; it prevents partial/double reversal.
CREATE OR REPLACE FUNCTION public.process_refund_atomic(
  _sale_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale record;
  _transaction record;
  _wallet record;
  _reversed integer := 0;
  _title text;
  _amount numeric;
BEGIN
  SELECT s.*, p.title INTO _sale
  FROM public.sales s
  LEFT JOIN public.products p ON p.id = s.product_id
  WHERE s.id = _sale_id
    AND s.status = 'completed'
  FOR UPDATE OF s;

  IF _sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale was already refunded or is not refundable';
  END IF;

  _title := COALESCE(_sale.title, 'product');

  FOR _transaction IN
    SELECT t.*
    FROM public.transactions t
    WHERE t.sale_id = _sale_id
      AND t.type IN ('sale_vendor'::transaction_type, 'sale_commission'::transaction_type)
      AND t.reversal_of_transaction_id IS NULL
    ORDER BY t.created_at, t.id
    FOR UPDATE
  LOOP
    _amount := abs(_transaction.amount);
    SELECT * INTO _wallet FROM public.wallets WHERE id = _transaction.wallet_id FOR UPDATE;
    IF _wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found for refund'; END IF;

    IF _transaction.earning_state = 'pending'::earning_state THEN
      IF _wallet.pending_balance < _amount THEN
        RAISE EXCEPTION 'Insufficient pending balance for refund reversal';
      END IF;
      UPDATE public.wallets
      SET pending_balance = pending_balance - _amount,
          total_earned = total_earned - _amount,
          updated_at = now()
      WHERE id = _transaction.wallet_id;
    ELSIF _transaction.earning_state = 'cleared'::earning_state THEN
      IF _wallet.cleared_balance < _amount OR _wallet.withdrawable_balance < _amount THEN
        RAISE EXCEPTION 'Insufficient cleared balance for refund reversal';
      END IF;
      UPDATE public.wallets
      SET cleared_balance = cleared_balance - _amount,
          withdrawable_balance = withdrawable_balance - _amount,
          total_earned = total_earned - _amount,
          updated_at = now()
      WHERE id = _transaction.wallet_id;
    ELSE
      RAISE EXCEPTION 'Unsupported earning state for refund reversal';
    END IF;

    INSERT INTO public.transactions (
      wallet_id, sale_id, amount, type, earning_state, description, reversal_of_transaction_id
    ) VALUES (
      _transaction.wallet_id, _sale_id, -_amount, 'refund', NULL,
      'Refund for ' || _title || COALESCE(': ' || NULLIF(_reason, ''), ''),
      _transaction.id
    );
    _reversed := _reversed + 1;
  END LOOP;

  UPDATE public.sales
  SET status = 'refunded', updated_at = now()
  WHERE id = _sale_id AND status = 'completed';

  RETURN jsonb_build_object('sale_id', _sale_id, 'transactions_reversed', _reversed);
END;
$$;

REVOKE ALL ON FUNCTION public.process_refund_atomic(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_refund_atomic(uuid, text) TO service_role;

-- Delivery access is token-only for unauthenticated buyers. Preserve vendor,
-- affiliate, and admin visibility from the base sales policy.
DROP POLICY IF EXISTS "Buyers can view own purchases by email" ON public.sales;

-- Reassert the authoritative payout integrity trigger in the final migration
-- order so older migration definitions cannot leave a live database at ₦2,500.
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
    SELECT id, user_id, withdrawable_balance INTO _wallet
    FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF _wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
    IF _wallet.user_id IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Payout wallet does not belong to this user'; END IF;
    IF NEW.amount > _wallet.withdrawable_balance THEN RAISE EXCEPTION 'Insufficient withdrawable balance'; END IF;
    SELECT COALESCE(value, '{}'::jsonb) INTO _feature_flags
    FROM public.platform_settings WHERE key = 'feature_flags' LIMIT 1;
    _withdrawal_fees_enabled := COALESCE((_feature_flags -> 'withdrawal_fees' ->> 'enabled')::boolean, true);
    _is_admin_user := public.has_role(NEW.user_id, 'admin'::app_role);
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

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_insert ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_insert
BEFORE INSERT ON public.payout_requests FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();

DROP TRIGGER IF EXISTS trg_enforce_payout_request_integrity_update ON public.payout_requests;
CREATE TRIGGER trg_enforce_payout_request_integrity_update
BEFORE UPDATE OF status ON public.payout_requests FOR EACH ROW
EXECUTE FUNCTION public.enforce_payout_request_integrity();