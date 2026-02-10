
-- Create daily_digests table for personalized daily messages
CREATE TABLE public.daily_digests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  digest_type TEXT NOT NULL DEFAULT 'affiliate',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_digests ENABLE ROW LEVEL SECURITY;

-- Users can view their own digests
CREATE POLICY "Users can view own digests" ON public.daily_digests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own digests (mark as read)
CREATE POLICY "Users can update own digests" ON public.daily_digests
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert (edge function)
CREATE POLICY "Service role can insert digests" ON public.daily_digests
  FOR INSERT WITH CHECK (true);

-- Index for fast user lookups
CREATE INDEX idx_daily_digests_user_id ON public.daily_digests(user_id, created_at DESC);
