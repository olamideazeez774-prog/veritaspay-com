-- Keep verification request state and profile verification state consistent.
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
