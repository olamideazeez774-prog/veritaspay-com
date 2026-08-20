-- Payment processing fee policy and exact-amount/refund accounting.
-- Paystack's actual fee is always sourced from transaction verification; the
-- estimator is only used to initialize the required customer amount.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS payment_processing_fee_bearer text NOT NULL DEFAULT 'vendor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_payment_processing_fee_bearer_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_payment_processing_fee_bearer_check
      CHECK (payment_processing_fee_bearer IN ('customer', 'vendor', 'split_50_50'));
  END IF;
END $$;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_processing_fee_bearer text NOT NULL DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS required_amount_kobo bigint,
  ADD COLUMN IF NOT EXISTS received_amount_kobo bigint,
  ADD COLUMN IF NOT EXISTS paystack_transaction_id bigint,
  ADD COLUMN IF NOT EXISTS paystack_fee_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_processing_fee_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_processing_fee_kobo bigint NOT NULL DEFAULT 0;

ALTER TABLE public.pending_payments
  ADD COLUMN IF NOT EXISTS expected_amount_kobo bigint,
  ADD COLUMN IF NOT EXISTS received_amount_kobo bigint,
  ADD COLUMN IF NOT EXISTS paystack_transaction_id bigint,
  ADD COLUMN IF NOT EXISTS paystack_fee_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_processing_fee_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_processing_fee_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mismatch_reason text,
  ADD COLUMN IF NOT EXISTS refund_amount_kobo bigint,
  ADD COLUMN IF NOT EXISTS refund_reference text,
  ADD COLUMN IF NOT EXISTS refund_status text;

CREATE INDEX IF NOT EXISTS idx_pending_payments_refund_status
  ON public.pending_payments (refund_status, created_at)
  WHERE refund_status IS NOT NULL;

COMMENT ON COLUMN public.products.payment_processing_fee_bearer IS
  'Who bears the Paystack processing fee: customer, vendor, or split_50_50.';
COMMENT ON COLUMN public.pending_payments.expected_amount_kobo IS
  'Exact server-computed Paystack charge in the smallest currency unit.';
COMMENT ON COLUMN public.pending_payments.received_amount_kobo IS
  'Exact amount returned by Paystack verification in the smallest currency unit.';
COMMENT ON COLUMN public.pending_payments.refund_status IS
  'Paystack refund lifecycle status for amount mismatches or other failed fulfillment.';