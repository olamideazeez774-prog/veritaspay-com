-- Repair found by live attack testing: create_verified_sale performed the
-- onboarding-balance deduction BEFORE the INSERT ... ON CONFLICT check for an
-- existing sale. On a duplicate (callback + webhook race), the conflict branch
-- returned early WITHOUT undoing the deduction — but worse, any state changed
-- before the insert was paid twice if the caller retried. Re-check sale
-- existence first, before any mutation, so duplicates are pure no-ops.
CREATE OR REPLACE FUNCTION public.create_verified_sale(
  _product_id uuid,
  _vendor_id uuid,
  _affiliate_id uuid,
  _buyer_email text,
  _total_amount numeric,
  _platform_fee numeric,
  _affiliate_commission numeric,
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
AS $fn$
DECLARE
  _sale_id uuid;
  _created boolean := false;
  _wallet_id uuid;
  _vendor_earnings numeric;
  _onboarding_deducted numeric := 0;
BEGIN
  -- Idempotency FIRST, before any mutation: a duplicate reference (callback
  -- + webhook race) must be a pure no-op returning the existing sale.
  IF _payment_reference IS NOT NULL THEN
    SELECT id INTO _sale_id
    FROM public.sales
    WHERE payment_reference = _payment_reference
    LIMIT 1;
    IF _sale_id IS NOT NULL THEN
      RETURN jsonb_build_object('sale_id', _sale_id, 'created', false);
    END IF;
  END IF;

  -- Onboarding starter-plan deduction (bounded by what is actually due).
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
    product_id, vendor_id, affiliate_id,
    buyer_email, total_amount, platform_fee, affiliate_commission,
    vendor_earnings, commission_percent_snapshot,
    platform_fee_percent_snapshot, status, refund_eligible_until,
    delivery_access_token, payment_reference, payment_gateway,
    payment_processing_fee_bearer, required_amount_kobo, received_amount_kobo,
    paystack_transaction_id, paystack_fee_kobo, customer_processing_fee_kobo,
    vendor_processing_fee_kobo, affiliate_processing_fee_kobo
  ) VALUES (
    _product_id, _vendor_id, _affiliate_id,
    lower(trim(_buyer_email)), _total_amount, _platform_fee, _affiliate_commission,
    _vendor_earnings, _commission_percent_snapshot,
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
    -- Lost a race with a concurrent identical insert; nothing was credited.
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

  RETURN jsonb_build_object('sale_id', _sale_id, 'created', _created, 'vendor_earnings', _vendor_earnings, 'onboarding_deducted', _onboarding_deducted);
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_verified_sale(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
  timestamptz, text, text, text, text, bigint, bigint, bigint, bigint, bigint,
  bigint, bigint, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_verified_sale(
  uuid, uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
  timestamptz, text, text, text, text, bigint, bigint, bigint, bigint, bigint,
  bigint, bigint, text
) TO service_role;
