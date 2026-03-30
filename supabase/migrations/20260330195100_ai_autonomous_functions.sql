-- =============================================
-- AI AUTONOMOUS HELPER FUNCTIONS
-- =============================================

-- Function to get trending products
CREATE OR REPLACE FUNCTION public.get_trending_products(since_date TIMESTAMPTZ)
RETURNS TABLE (
  id UUID,
  title TEXT,
  conversion_rate NUMERIC,
  sales_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    COALESCE(
      (COUNT(s.id) * 100.0 / NULLIF(
        (SELECT SUM(clicks_count) 
         FROM affiliate_links al 
         WHERE al.product_id = p.id), 0
      )), 0
    )::NUMERIC as conversion_rate,
    COUNT(s.id) as sales_count
  FROM products p
  LEFT JOIN sales s ON s.product_id = p.id 
    AND s.created_at >= since_date
    AND s.status = 'completed'
  WHERE p.status = 'active' AND p.is_approved = true
  GROUP BY p.id, p.title
  HAVING COUNT(s.id) > 0
  ORDER BY conversion_rate DESC
  LIMIT 10;
END;
$$;

-- Function to get declining affiliates
CREATE OR REPLACE FUNCTION public.get_declining_affiliates(days INTEGER DEFAULT 14)
RETURNS TABLE (
  user_id UUID,
  current_period_sales BIGINT,
  previous_period_sales BIGINT,
  percent_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_start TIMESTAMPTZ;
  previous_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  period_end := NOW();
  current_start := period_end - (days || ' days')::INTERVAL;
  previous_start := current_start - (days || ' days')::INTERVAL;

  RETURN QUERY
  WITH current_sales AS (
    SELECT s.affiliate_id, COUNT(*) as sales_count
    FROM sales s
    WHERE s.created_at >= current_start 
      AND s.created_at < period_end
      AND s.status = 'completed'
    GROUP BY s.affiliate_id
  ),
  previous_sales AS (
    SELECT s.affiliate_id, COUNT(*) as sales_count
    FROM sales s
    WHERE s.created_at >= previous_start 
      AND s.created_at < current_start
      AND s.status = 'completed'
    GROUP BY s.affiliate_id
  )
  SELECT 
    COALESCE(c.affiliate_id, p.affiliate_id) as user_id,
    COALESCE(c.sales_count, 0) as current_period_sales,
    COALESCE(p.sales_count, 0) as previous_period_sales,
    CASE 
      WHEN COALESCE(p.sales_count, 0) = 0 THEN 0
      ELSE ((COALESCE(p.sales_count, 0) - COALESCE(c.sales_count, 0)) * 100.0 / p.sales_count)::NUMERIC
    END as percent_change
  FROM current_sales c
  FULL OUTER JOIN previous_sales p ON c.affiliate_id = p.affiliate_id
  WHERE COALESCE(c.sales_count, 0) < COALESCE(p.sales_count, 0)
    AND COALESCE(p.sales_count, 0) > 0
  ORDER BY percent_change DESC
  LIMIT 20;
END;
$$;

-- Function to mark AI alert as read
CREATE OR REPLACE FUNCTION public.mark_ai_alert_read(alert_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_smart_alerts
  SET is_read = true
  WHERE id = alert_id
    AND (user_id = auth.uid() OR user_id IS NULL);
END;
$$;

-- Function to dismiss AI alert
CREATE OR REPLACE FUNCTION public.dismiss_ai_alert(alert_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_smart_alerts
  SET dismissed_at = NOW()
  WHERE id = alert_id
    AND (user_id = auth.uid() OR user_id IS NULL);
END;
$$;

-- Function to get user's unread alert count
CREATE OR REPLACE FUNCTION public.get_unread_alert_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_result BIGINT;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM public.ai_smart_alerts
  WHERE (user_id = auth.uid() OR user_id IS NULL)
    AND is_read = false
    AND dismissed_at IS NULL;
  
  RETURN count_result;
END;
$$;

-- Function to publish scheduled content (called by cron or manually)
CREATE OR REPLACE FUNCTION public.publish_scheduled_content()
RETURNS TABLE (published_id UUID, user_id UUID, platform TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE public.ai_content_calendar
    SET status = 'published',
        updated_at = NOW()
    WHERE status = 'scheduled'
      AND scheduled_at <= NOW()
    RETURNING id, user_id, platform
  )
  SELECT updated.id, updated.user_id, updated.platform FROM updated;
END;
$$;
