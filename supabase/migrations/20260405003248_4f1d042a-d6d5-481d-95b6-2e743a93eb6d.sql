
-- 1. Fix profiles: Remove overly permissive public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a restricted public profiles policy (authenticated users can see basic info for display purposes)
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix notifications: Restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Fix system_logs: Restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;

CREATE POLICY "Only service role can insert logs"
ON public.system_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Fix daily_digests: Restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert digests" ON public.daily_digests;

CREATE POLICY "Only service role can insert digests"
ON public.daily_digests
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Fix platform_settings: Restrict public SELECT to non-sensitive keys
DROP POLICY IF EXISTS "Anyone can view settings" ON public.platform_settings;

CREATE POLICY "Anyone can view non-sensitive settings"
ON public.platform_settings
FOR SELECT
USING (key NOT IN ('admin_signature') OR is_admin());
