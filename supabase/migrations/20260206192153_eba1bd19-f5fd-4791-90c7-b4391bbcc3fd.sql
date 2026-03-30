
-- Create system_logs table for audit-grade event logging
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  actor_id uuid,
  actor_email text,
  related_id text,
  related_type text,
  amount numeric,
  status text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX idx_system_logs_category ON public.system_logs(category);
CREATE INDEX idx_system_logs_actor_id ON public.system_logs(actor_id);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs" ON public.system_logs
  FOR SELECT USING (public.is_admin());

-- Allow triggers/system to insert logs
CREATE POLICY "System can insert logs" ON public.system_logs
  FOR INSERT WITH CHECK (true);

-- Function to write system logs
CREATE OR REPLACE FUNCTION public.write_system_log(
  _event_type text,
  _category text,
  _description text,
  _actor_id uuid DEFAULT NULL,
  _related_id text DEFAULT NULL,
  _related_type text DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _status text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_email text;
BEGIN
  IF _actor_id IS NOT NULL THEN
    SELECT email INTO _actor_email FROM public.profiles WHERE id = _actor_id;
  END IF;
  
  INSERT INTO public.system_logs (event_type, category, actor_id, actor_email, related_id, related_type, amount, status, description, metadata)
  VALUES (_event_type, _category, _actor_id, _actor_email, _related_id, _related_type, _amount, _status, _description, _metadata);
END;
$$;

-- Trigger: Log product changes
CREATE OR REPLACE FUNCTION public.log_product_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_system_log('product_submitted', 'product', 'Product "' || NEW.title || '" submitted', NEW.vendor_id, NEW.id::text, 'product', NEW.price, NEW.status::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
      IF NEW.is_approved THEN
        PERFORM public.write_system_log('product_approved', 'product', 'Product "' || NEW.title || '" approved', auth.uid(), NEW.id::text, 'product', NEW.price, 'approved');
      ELSE
        PERFORM public.write_system_log('product_rejected', 'product', 'Product "' || NEW.title || '" approval revoked', auth.uid(), NEW.id::text, 'product', NEW.price, 'rejected');
      END IF;
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.write_system_log('product_status_changed', 'product', 'Product "' || NEW.title || '" status changed to ' || NEW.status::text, NEW.vendor_id, NEW.id::text, 'product', NEW.price, NEW.status::text);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_product_change AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_change();

-- Trigger: Log sales
CREATE OR REPLACE FUNCTION public.log_sale_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_system_log('sale_completed', 'financial', 'Sale of ' || NEW.total_amount || ' recorded', NEW.vendor_id, NEW.id::text, 'sale', NEW.total_amount, NEW.status::text, jsonb_build_object('product_id', NEW.product_id, 'buyer_email', NEW.buyer_email, 'platform_fee', NEW.platform_fee, 'affiliate_commission', NEW.affiliate_commission));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'refunded' THEN
    PERFORM public.write_system_log('refund_issued', 'financial', 'Refund of ' || NEW.total_amount || ' issued', auth.uid(), NEW.id::text, 'sale', NEW.total_amount, 'refunded');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_sale_change AFTER INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_sale_change();

-- Trigger: Log payout requests
CREATE OR REPLACE FUNCTION public.log_payout_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_system_log('withdrawal_requested', 'financial', 'Withdrawal of ' || NEW.amount || ' requested', NEW.user_id, NEW.id::text, 'payout', NEW.amount, 'pending');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_system_log(
      CASE NEW.status WHEN 'paid' THEN 'payout_completed' WHEN 'rejected' THEN 'payout_rejected' WHEN 'processing' THEN 'payout_processing' ELSE 'payout_updated' END,
      'financial', 'Payout of ' || NEW.amount || ' ' || NEW.status::text, auth.uid(), NEW.id::text, 'payout', NEW.amount, NEW.status::text
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_payout_change AFTER INSERT OR UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.log_payout_change();

-- Trigger: Log user role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_system_log(
      CASE NEW.role WHEN 'vendor' THEN 'vendor_registered' WHEN 'affiliate' THEN 'affiliate_registered' WHEN 'admin' THEN 'admin_assigned' END,
      'user', 'User assigned role: ' || NEW.role::text, NEW.user_id, NEW.id::text, 'user_role', NULL, NEW.role::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_system_log('role_removed', 'user', 'Role removed: ' || OLD.role::text, auth.uid(), OLD.id::text, 'user_role', NULL, OLD.role::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_role_change AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Trigger: Log new user registration
CREATE OR REPLACE FUNCTION public.log_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.write_system_log('user_registered', 'user', 'New user registered: ' || NEW.email, NEW.id, NEW.id::text, 'profile', NULL, 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_new_profile AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_new_profile();

-- Trigger: Log listing payment changes
CREATE OR REPLACE FUNCTION public.log_listing_payment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_system_log('payment_received', 'financial', 'Listing payment of ' || NEW.amount || ' received (ref: ' || NEW.payment_reference || ')', NEW.vendor_id, NEW.id::text, 'listing_payment', NEW.amount, NEW.status);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_system_log(
      CASE NEW.status WHEN 'verified' THEN 'payment_verified' WHEN 'rejected' THEN 'payment_failed' ELSE 'payment_updated' END,
      'financial', 'Listing payment ' || NEW.status || ' (ref: ' || NEW.payment_reference || ')', auth.uid(), NEW.id::text, 'listing_payment', NEW.amount, NEW.status
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_listing_payment_change AFTER INSERT OR UPDATE ON public.product_listing_payments FOR EACH ROW EXECUTE FUNCTION public.log_listing_payment_change();

-- Trigger: Log transactions
CREATE OR REPLACE FUNCTION public.log_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wallet_user_id uuid;
BEGIN
  SELECT user_id INTO _wallet_user_id FROM public.wallets WHERE id = NEW.wallet_id;
  PERFORM public.write_system_log(
    CASE NEW.type WHEN 'sale_commission' THEN 'commission_recorded' WHEN 'sale_vendor' THEN 'vendor_earning_recorded' WHEN 'platform_fee' THEN 'platform_fee_recorded' WHEN 'withdrawal' THEN 'withdrawal_processed' WHEN 'refund' THEN 'commission_reversed' END,
    'financial', NEW.type::text || ': ' || ABS(NEW.amount), _wallet_user_id, NEW.id::text, 'transaction', NEW.amount, COALESCE(NEW.earning_state::text, NEW.type::text)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_transaction AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction();
