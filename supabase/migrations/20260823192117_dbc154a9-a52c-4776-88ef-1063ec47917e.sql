DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'product_status' AND e.enumlabel = 'pending_review'
  ) THEN
    ALTER TYPE public.product_status ADD VALUE 'pending_review';
  END IF;
END
$$;