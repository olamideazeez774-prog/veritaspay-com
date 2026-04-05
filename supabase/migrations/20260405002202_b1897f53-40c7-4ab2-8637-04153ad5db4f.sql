
-- Drop all triggers first to avoid conflicts
DROP TRIGGER IF EXISTS on_sale_notify ON public.sales;
DROP TRIGGER IF EXISTS on_sale_log ON public.sales;
DROP TRIGGER IF EXISTS on_payout_notify ON public.payout_requests;
DROP TRIGGER IF EXISTS on_payout_log ON public.payout_requests;
DROP TRIGGER IF EXISTS on_product_log ON public.products;
DROP TRIGGER IF EXISTS on_product_approval_check ON public.products;
DROP TRIGGER IF EXISTS on_transaction_log ON public.transactions;
DROP TRIGGER IF EXISTS on_listing_payment_log ON public.product_listing_payments;
DROP TRIGGER IF EXISTS on_verification_update ON public.verification_requests;
DROP TRIGGER IF EXISTS on_announcement_publish ON public.vendor_announcements;
DROP TRIGGER IF EXISTS on_admin_message ON public.user_messages;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_role_change ON public.user_roles;
DROP TRIGGER IF EXISTS check_role_duplicate ON public.user_roles;
DROP TRIGGER IF EXISTS on_click_increment ON public.clicks;
DROP TRIGGER IF EXISTS auto_gen_affiliate_code ON public.affiliate_links;
DROP TRIGGER IF EXISTS auto_gen_referral_code ON public.affiliate_referral_codes;
DROP TRIGGER IF EXISTS on_certificate_issued ON public.certificates;

-- Re-create all triggers
CREATE TRIGGER on_sale_notify AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.notify_on_sale();
CREATE TRIGGER on_sale_log AFTER INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_sale_change();
CREATE TRIGGER on_payout_notify AFTER UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_payout_change();
CREATE TRIGGER on_payout_log AFTER INSERT OR UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.log_payout_change();
CREATE TRIGGER on_product_log AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_change();
CREATE TRIGGER on_product_approval_check BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_product_approval();
CREATE TRIGGER on_transaction_log AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction();
CREATE TRIGGER on_listing_payment_log AFTER INSERT OR UPDATE ON public.product_listing_payments FOR EACH ROW EXECUTE FUNCTION public.log_listing_payment_change();
CREATE TRIGGER on_verification_update AFTER UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_verification_update();
CREATE TRIGGER on_announcement_publish AFTER INSERT OR UPDATE ON public.vendor_announcements FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement();
CREATE TRIGGER on_admin_message AFTER INSERT ON public.user_messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_admin_message();
CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_new_profile();
CREATE TRIGGER on_role_change AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
CREATE TRIGGER check_role_duplicate BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.check_role_not_exists();
CREATE TRIGGER on_click_increment AFTER INSERT ON public.clicks FOR EACH ROW EXECUTE FUNCTION public.increment_click_count();
CREATE TRIGGER auto_gen_affiliate_code BEFORE INSERT ON public.affiliate_links FOR EACH ROW EXECUTE FUNCTION public.auto_generate_affiliate_code();
CREATE TRIGGER auto_gen_referral_code BEFORE INSERT ON public.affiliate_referral_codes FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();
CREATE TRIGGER on_certificate_issued AFTER INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.notify_on_certificate();

-- Enable realtime on user_messages (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
