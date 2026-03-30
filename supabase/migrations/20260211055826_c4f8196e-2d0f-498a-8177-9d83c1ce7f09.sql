
-- Add moderation columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  image_url text,
  cta_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create user_messages table
CREATE TABLE public.user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_admin_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert messages" ON public.user_messages
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can view all messages" ON public.user_messages
  FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own messages" ON public.user_messages
  FOR SELECT USING (auth.uid() = to_user_id);
CREATE POLICY "Users can update own messages" ON public.user_messages
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Create verification_requests table
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path text NOT NULL DEFAULT 'earned',
  status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.verification_requests
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can create requests" ON public.verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update requests" ON public.verification_requests
  FOR UPDATE USING (is_admin());

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Notification triggers for sales
CREATE OR REPLACE FUNCTION public.notify_on_sale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  -- Notify vendor
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (NEW.vendor_id, 'sale', 'New Sale!', 'You earned ₦' || NEW.vendor_earnings || ' from a sale.');
  
  -- Notify affiliate if exists
  IF NEW.affiliate_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.affiliate_id, 'commission', 'Commission Earned!', 'You earned ₦' || NEW.affiliate_commission || ' in commission.');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sale_notify AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_sale();

-- Notification trigger for payout status changes
CREATE OR REPLACE FUNCTION public.notify_on_payout_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'payout', 'Payout ' || NEW.status, 'Your payout of ₦' || NEW.amount || ' is now ' || NEW.status || '.');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payout_notify AFTER UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_payout_change();
