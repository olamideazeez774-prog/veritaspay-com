-- =============================================
-- AI AUTONOMOUS FEATURES MIGRATION
-- Content calendar, smart alerts, auto-optimization
-- =============================================

-- AI Content Calendar table
CREATE TABLE IF NOT EXISTS public.ai_content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'social_post', 'email', 'blog', 'ad'
  platform TEXT, -- 'instagram', 'twitter', 'facebook', 'email', etc.
  title TEXT NOT NULL,
  content TEXT,
  affiliate_link_id UUID REFERENCES public.affiliate_links(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'cancelled'
  ai_generated BOOLEAN DEFAULT true,
  ai_prompt TEXT,
  performance_metrics JSONB, -- { clicks: 0, conversions: 0, revenue: 0 }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_content_calendar ENABLE ROW LEVEL SECURITY;

-- Users can only see their own content calendar
CREATE POLICY "Users can view own content calendar"
  ON public.ai_content_calendar FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own content calendar"
  ON public.ai_content_calendar FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all content calendar"
  ON public.ai_content_calendar FOR SELECT
  USING (public.is_admin());

-- Create indexes
CREATE INDEX idx_ai_calendar_user ON public.ai_content_calendar(user_id);
CREATE INDEX idx_ai_calendar_scheduled ON public.ai_content_calendar(scheduled_at);
CREATE INDEX idx_ai_calendar_status ON public.ai_content_calendar(status);

-- AI Smart Alerts table
CREATE TABLE IF NOT EXISTS public.ai_smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for platform-wide alerts
  alert_type TEXT NOT NULL, -- 'opportunity', 'trend', 'optimization', 'warning'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'low', 'medium', 'high'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_product_id UUID REFERENCES public.products(id),
  related_link_id UUID REFERENCES public.affiliate_links(id),
  action_url TEXT,
  action_text TEXT,
  is_read BOOLEAN DEFAULT false,
  ai_analysis JSONB, -- AI reasoning and data
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_smart_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY "Users can view own alerts"
  ON public.ai_smart_alerts FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own alerts"
  ON public.ai_smart_alerts FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Create indexes
CREATE INDEX idx_ai_alerts_user ON public.ai_smart_alerts(user_id);
CREATE INDEX idx_ai_alerts_unread ON public.ai_smart_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_ai_alerts_type ON public.ai_smart_alerts(alert_type);

-- AI Optimization Settings (per user)
CREATE TABLE IF NOT EXISTS public.ai_optimization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Content generation settings
  auto_generate_captions BOOLEAN DEFAULT false,
  auto_schedule_posts BOOLEAN DEFAULT false,
  content_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  preferred_platforms TEXT[] DEFAULT ARRAY['instagram', 'twitter'],
  -- Alert settings
  smart_alerts_enabled BOOLEAN DEFAULT true,
  alert_min_severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  -- Optimization settings
  auto_optimize_commissions BOOLEAN DEFAULT false,
  auto_adjust_prices BOOLEAN DEFAULT false,
  -- Timing preferences
  preferred_posting_times TEXT[] DEFAULT ARRAY['09:00', '18:00'],
  timezone TEXT DEFAULT 'Africa/Lagos',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_optimization_settings ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own settings
CREATE POLICY "Users can manage own AI settings"
  ON public.ai_optimization_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index
CREATE INDEX idx_ai_settings_user ON public.ai_optimization_settings(user_id);

-- AI Performance Metrics (tracking AI effectiveness)
CREATE TABLE IF NOT EXISTS public.ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'content_engagement', 'conversion_lift', 'time_saved'
  value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI metrics"
  ON public.ai_performance_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX idx_ai_metrics_user ON public.ai_performance_metrics(user_id, period_start);

-- Function to auto-create default AI settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_ai_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_optimization_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create settings on signup
DROP TRIGGER IF EXISTS on_auth_user_created_ai_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_ai_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_ai_settings();

-- Add updated_at trigger for content calendar
CREATE OR REPLACE FUNCTION public.update_ai_calendar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_calendar_updated_at ON public.ai_content_calendar;
CREATE TRIGGER ai_calendar_updated_at
  BEFORE UPDATE ON public.ai_content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_calendar_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.ai_content_calendar IS 'AI-generated and scheduled content for affiliates';
COMMENT ON TABLE public.ai_smart_alerts IS 'AI-generated smart alerts and opportunities';
COMMENT ON TABLE public.ai_optimization_settings IS 'User preferences for AI autonomous features';
COMMENT ON TABLE public.ai_performance_metrics IS 'Tracking AI effectiveness and ROI';
