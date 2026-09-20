-- Repair for fresh environments: the next migration re-CREATEs policies
-- that already exist from earlier migrations (CREATE POLICY is not
-- idempotent). Dropping them first makes the next step idempotent.
-- The live database is unaffected: IF EXISTS is a no-op there.

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert messages" ON public.user_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.user_messages;
DROP POLICY IF EXISTS "Users can view own requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can upload own avatar" ON public.storage;
DROP POLICY IF EXISTS "Users can update own avatar" ON public.storage;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON public.storage;
DROP POLICY IF EXISTS "Users can delete own avatar" ON public.storage;
