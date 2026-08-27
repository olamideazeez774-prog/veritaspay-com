-- Pin search_path on the one remaining mutable function
ALTER FUNCTION public.compute_withdrawal_fee(numeric) SET search_path = public;

-- Revoke direct API execute rights on every public function, then re-grant only
-- the routines the client legitimately calls.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Client-callable routines
GRANT EXECUTE ON FUNCTION public.claim_certificate(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_verification_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_ai_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ai_alert_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_alert_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_withdrawal_fee(numeric) TO anon, authenticated;