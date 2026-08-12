ALTER TABLE public.affiliate_ranks ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS cert_type text NOT NULL DEFAULT 'rank';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS threshold_amount numeric;

DELETE FROM public.certificates c
USING public.certificates keep
WHERE c.cert_type = 'rank'
  AND keep.cert_type = 'rank'
  AND c.user_id = keep.user_id
  AND c.rank_name = keep.rank_name
  AND (keep.issued_at, keep.id) < (c.issued_at, c.id);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_rank_unique
  ON public.certificates (user_id, rank_name)
  WHERE cert_type = 'rank';

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_earning_unique
  ON public.certificates (user_id, threshold_amount)
  WHERE cert_type = 'earning';