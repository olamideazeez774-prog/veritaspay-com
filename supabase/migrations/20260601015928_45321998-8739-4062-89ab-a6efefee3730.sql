
-- Pending payments table: source of truth for every paid action
CREATE TABLE IF NOT EXISTS public.pending_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  purpose text NOT NULL,
  reference text NOT NULL UNIQUE,
  expected_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pending_payments TO authenticated;
GRANT ALL ON public.pending_payments TO service_role;

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending payments"
ON public.pending_payments FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pending_payments_user ON public.pending_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON public.pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_reference ON public.pending_payments(reference);

CREATE TRIGGER trg_pending_payments_updated_at
BEFORE UPDATE ON public.pending_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
