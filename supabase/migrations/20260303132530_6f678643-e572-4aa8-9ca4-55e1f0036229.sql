
-- Create triggers for notification population

-- 1. Trigger: notify on sale insert (already exists as function, just create trigger)
CREATE OR REPLACE TRIGGER trg_notify_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_sale();

-- 2. Trigger: notify on payout status change
CREATE OR REPLACE TRIGGER trg_notify_on_payout_change
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_payout_change();

-- 3. Function + Trigger: notify on certificate claim
CREATE OR REPLACE FUNCTION public.notify_on_certificate()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (NEW.user_id, 'certificate', 'Certificate Issued!', 'Your ' || NEW.rank_name || ' certificate has been issued. Download it from the Certificates page.');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_on_certificate
  AFTER INSERT ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_certificate();

-- 4. Function + Trigger: notify on verification request status change  
CREATE OR REPLACE FUNCTION public.notify_on_verification_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'verification', 'Verified!', 'Your verification request has been approved. Your profile now shows a verified badge.');
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'verification', 'Verification Update', 'Your verification request was not approved at this time.');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_on_verification
  AFTER UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_verification_update();

-- 5. Function + Trigger: notify on admin message
CREATE OR REPLACE FUNCTION public.notify_on_admin_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, cta_url)
  VALUES (NEW.to_user_id, 'message', 'New Message from Admin', LEFT(NEW.message, 100), '/dashboard/inbox');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_on_admin_message
  AFTER INSERT ON public.user_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_admin_message();

-- 6. Function + Trigger: notify on vendor announcement publish
CREATE OR REPLACE FUNCTION public.notify_on_announcement()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _aff RECORD;
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    -- Notify all affiliates
    FOR _aff IN SELECT user_id FROM public.user_roles WHERE role = 'affiliate'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (_aff.user_id, 'announcement', 'New Vendor Update', NEW.title);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notify_on_announcement
  AFTER INSERT OR UPDATE ON public.vendor_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_announcement();
