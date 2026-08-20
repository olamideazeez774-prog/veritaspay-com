-- Delivery tracking for completed sales. Delivery links are bearer tokens and are
-- resolved only by the service role through the get-delivery edge function; no
-- public policy on public.sales is added here.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS delivery_access_token text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_method text,
  ADD COLUMN IF NOT EXISTS buyer_access_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS sales_delivery_access_token_unique
  ON public.sales (delivery_access_token)
  WHERE delivery_access_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_delivery_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
    SELECT EXISTS(SELECT 1 FROM public.sales WHERE delivery_access_token = new_token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_delivery_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_delivery_token() TO service_role;

CREATE OR REPLACE FUNCTION public.auto_generate_delivery_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'::sale_status AND NEW.delivery_access_token IS NULL THEN
    NEW.delivery_access_token := public.generate_delivery_token();
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
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
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_delivery_token();

DROP TRIGGER IF EXISTS auto_delivery_token_trigger ON public.sales;
CREATE TRIGGER auto_delivery_token_trigger
  BEFORE UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_delivery_token();

CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  access_method text NOT NULL,
  ip_address text,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_logs TO authenticated;
GRANT ALL ON public.delivery_logs TO service_role;

ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view delivery logs" ON public.delivery_logs;
CREATE POLICY "Admins can view delivery logs"
  ON public.delivery_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role can insert delivery logs" ON public.delivery_logs;

CREATE INDEX IF NOT EXISTS idx_delivery_logs_sale ON public.delivery_logs(sale_id);

COMMENT ON COLUMN public.sales.delivery_access_token IS 'Bearer token letting a buyer open their purchase without signing in.';
COMMENT ON COLUMN public.sales.buyer_access_count IS 'Number of times the buyer has opened the delivery page.';