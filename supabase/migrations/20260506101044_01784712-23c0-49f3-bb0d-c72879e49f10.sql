
-- 1. Allow admins to update any profile (fixes verification approve failing on profiles.is_verified update)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Public flag for "admin signature configured" so non-admins can know without seeing the URL
INSERT INTO public.platform_settings (key, value)
VALUES ('admin_signature_configured', '{"configured": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Trigger to keep admin_signature_configured in sync with admin_signature
CREATE OR REPLACE FUNCTION public.sync_admin_signature_configured()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_url boolean := false;
BEGIN
  IF NEW.key = 'admin_signature' THEN
    has_url := COALESCE((NEW.value ->> 'url') IS NOT NULL AND length(NEW.value ->> 'url') > 0, false);
    INSERT INTO public.platform_settings (key, value)
    VALUES ('admin_signature_configured', jsonb_build_object('configured', has_url))
    ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('configured', has_url), updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_admin_signature_configured_trigger ON public.platform_settings;
CREATE TRIGGER sync_admin_signature_configured_trigger
AFTER INSERT OR UPDATE ON public.platform_settings
FOR EACH ROW
WHEN (NEW.key = 'admin_signature')
EXECUTE FUNCTION public.sync_admin_signature_configured();

-- Backfill the configured flag from any existing admin_signature row
DO $$
DECLARE
  sig record;
BEGIN
  SELECT value INTO sig FROM public.platform_settings WHERE key = 'admin_signature' LIMIT 1;
  IF FOUND THEN
    UPDATE public.platform_settings
    SET value = jsonb_build_object('configured', COALESCE((sig.value ->> 'url') IS NOT NULL AND length(sig.value ->> 'url') > 0, false)),
        updated_at = now()
    WHERE key = 'admin_signature_configured';
  END IF;
END $$;
