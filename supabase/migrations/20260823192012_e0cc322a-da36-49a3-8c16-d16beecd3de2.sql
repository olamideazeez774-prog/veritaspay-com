CREATE OR REPLACE FUNCTION public.claim_certificate(
  _cert_type text,
  _rank_name text DEFAULT NULL,
  _threshold_amount numeric DEFAULT NULL
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_admin boolean := public.is_admin();
  _profile record;
  _rank record;
  _existing public.certificates;
  _certificate public.certificates;
  _total_earned numeric := 0;
  _effective_rank_name text;
  _metadata jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _cert_type NOT IN ('rank', 'earning') THEN
    RAISE EXCEPTION 'Unsupported certificate type';
  END IF;
  IF NOT _is_admin AND NOT EXISTS (
    SELECT 1 FROM public.platform_settings
    WHERE key = 'admin_signature_configured'
      AND COALESCE(value ->> 'configured', 'false') = 'true'
  ) THEN
    RAISE EXCEPTION 'Certificates are not yet available';
  END IF;
  IF NOT _is_admin AND NOT EXISTS (
    SELECT 1 FROM public.platform_settings
    WHERE key = 'admin_signature'
      AND NULLIF(value ->> 'url', '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Admin signature is required';
  END IF;

  SELECT full_name, email, avatar_url INTO _profile
  FROM public.profiles WHERE id = _user_id;

  IF _cert_type = 'rank' THEN
    IF _rank_name IS NULL THEN RAISE EXCEPTION 'Rank name is required'; END IF;
    SELECT * INTO _rank FROM public.affiliate_ranks WHERE rank_name = _rank_name;
    IF _rank.id IS NULL THEN RAISE EXCEPTION 'Rank not found'; END IF;
    IF NOT _is_admin THEN
      SELECT COALESCE(total_earned, 0) INTO _total_earned
      FROM public.wallets WHERE user_id = _user_id;
      IF _total_earned < _rank.min_earnings THEN
        RAISE EXCEPTION 'Rank milestone has not been reached';
      END IF;
    END IF;
    SELECT * INTO _existing FROM public.certificates
    WHERE user_id = _user_id AND cert_type = 'rank' AND rank_name = _rank_name
    LIMIT 1;
    _effective_rank_name := _rank_name;
    _metadata := jsonb_build_object(
      'full_name', COALESCE(_profile.full_name, ''),
      'email', COALESCE(_profile.email, ''),
      'total_commission', CASE WHEN _is_admin THEN 999999999 ELSE _total_earned END,
      'milestone_date', now(),
      'platform_name', 'Mirvyn',
      'avatar_url', COALESCE(_profile.avatar_url, ''),
      'rank_description', COALESCE(_rank.description, '')
    );
  ELSE
    IF _threshold_amount IS NULL OR _threshold_amount <= 0 THEN
      RAISE EXCEPTION 'Earning threshold is required';
    END IF;
    IF NOT _is_admin THEN
      SELECT COALESCE(total_earned, 0) INTO _total_earned
      FROM public.wallets WHERE user_id = _user_id;
      IF _total_earned < _threshold_amount THEN
        RAISE EXCEPTION 'Earning milestone has not been reached';
      END IF;
    END IF;
    SELECT * INTO _existing FROM public.certificates
    WHERE user_id = _user_id AND cert_type = 'earning' AND threshold_amount = _threshold_amount
    LIMIT 1;
    _effective_rank_name := 'Earning ' || _threshold_amount::text;
    _metadata := jsonb_build_object(
      'full_name', COALESCE(_profile.full_name, ''),
      'email', COALESCE(_profile.email, ''),
      'total_commission', _threshold_amount,
      'milestone_date', now(),
      'platform_name', 'Mirvyn',
      'avatar_url', COALESCE(_profile.avatar_url, '')
    );
  END IF;

  IF _existing.id IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.certificates (
    user_id, rank_name, cert_type, threshold_amount, certificate_hash, metadata
  ) VALUES (
    _user_id,
    _effective_rank_name,
    _cert_type,
    CASE WHEN _cert_type = 'earning' THEN _threshold_amount ELSE _rank.min_earnings END,
    upper('VP-' || _cert_type || '-' || left(_user_id::text, 8) || '-' || replace(gen_random_uuid()::text, '-', '')),
    _metadata
  )
  RETURNING * INTO _certificate;

  RETURN _certificate;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_certificate(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_certificate(text, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_verification_request(
  _request_id uuid,
  _status text,
  _notes text DEFAULT NULL
)
RETURNS public.verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.verification_requests;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported verification status';
  END IF;

  SELECT * INTO _request
  FROM public.verification_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF _request.id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  UPDATE public.verification_requests
  SET status = _status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id
  RETURNING * INTO _request;

  IF _status = 'approved' THEN
    UPDATE public.profiles
    SET is_verified = true,
        admin_notes = COALESCE(_notes, admin_notes),
        updated_at = now()
    WHERE id = _request.user_id;
  ELSIF _notes IS NOT NULL THEN
    UPDATE public.profiles
    SET admin_notes = _notes,
        updated_at = now()
    WHERE id = _request.user_id;
  END IF;

  RETURN _request;
END;
$$;

REVOKE ALL ON FUNCTION public.review_verification_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_verification_request(uuid, text, text) TO authenticated;