-- 1. Fix admin_notes privacy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
);

-- 2. Create all triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_sale_notify') THEN
    CREATE TRIGGER on_sale_notify AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.notify_on_sale();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_payout_change_notify') THEN
    CREATE TRIGGER on_payout_change_notify AFTER UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_payout_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_payout_log') THEN
    CREATE TRIGGER on_payout_log AFTER INSERT OR UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.log_payout_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_role_before_insert') THEN
    CREATE TRIGGER check_role_before_insert BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.check_role_not_exists();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_admin_message_notify') THEN
    CREATE TRIGGER on_admin_message_notify AFTER INSERT ON public.user_messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_admin_message();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_verification_update_notify') THEN
    CREATE TRIGGER on_verification_update_notify AFTER UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_verification_update();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_announcement_notify') THEN
    CREATE TRIGGER on_announcement_notify AFTER INSERT OR UPDATE ON public.vendor_announcements FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auto_gen_affiliate_code') THEN
    CREATE TRIGGER auto_gen_affiliate_code BEFORE INSERT ON public.affiliate_links FOR EACH ROW EXECUTE FUNCTION public.auto_generate_affiliate_code();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_product_change_log') THEN
    CREATE TRIGGER on_product_change_log AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_transaction_log') THEN
    CREATE TRIGGER on_transaction_log AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auto_gen_referral_code') THEN
    CREATE TRIGGER auto_gen_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_profile_log') THEN
    CREATE TRIGGER on_new_profile_log AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_new_profile();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_certificate_notify') THEN
    CREATE TRIGGER on_certificate_notify AFTER INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.notify_on_certificate();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_product_approval') THEN
    CREATE TRIGGER check_product_approval BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_product_approval();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_click_increment') THEN
    CREATE TRIGGER on_click_increment AFTER INSERT ON public.clicks FOR EACH ROW EXECUTE FUNCTION public.increment_click_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_sale_change_log') THEN
    CREATE TRIGGER on_sale_change_log AFTER INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_sale_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_role_change_log') THEN
    CREATE TRIGGER on_role_change_log AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_listing_payment_log') THEN
    CREATE TRIGGER on_listing_payment_log AFTER INSERT OR UPDATE ON public.product_listing_payments FOR EACH ROW EXECUTE FUNCTION public.log_listing_payment_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallets_updated_at') THEN
    CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;