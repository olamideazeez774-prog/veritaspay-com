
-- Fix referral code trigger to handle empty strings (not just NULL)
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- 1. Commission Rules table
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'tiered', -- tiered, time_boost, first_sale_bonus, per_product, per_affiliate, recurring
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  affiliate_id UUID,
  min_sales INTEGER DEFAULT 0,
  commission_override NUMERIC,
  bonus_amount NUMERIC DEFAULT 0,
  boost_percent NUMERIC DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage commission rules" ON public.commission_rules FOR ALL USING (public.is_admin());
CREATE POLICY "Anyone can view active rules" ON public.commission_rules FOR SELECT USING (is_active = true);

-- 2. Fraud Events table
CREATE TABLE public.fraud_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- duplicate_click, self_referral, rapid_conversion, ip_anomaly, device_fingerprint
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  user_id UUID,
  related_id TEXT,
  related_type TEXT,
  description TEXT NOT NULL,
  ip_address TEXT,
  device_fingerprint TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'flagged', -- flagged, reviewed, dismissed, confirmed
  admin_notes TEXT,
  commission_held BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage fraud events" ON public.fraud_events FOR ALL USING (public.is_admin());
CREATE INDEX idx_fraud_events_user ON public.fraud_events(user_id);
CREATE INDEX idx_fraud_events_status ON public.fraud_events(status);
CREATE INDEX idx_fraud_events_created ON public.fraud_events(created_at DESC);

-- 3. Vendor Announcements table
CREATE TABLE public.vendor_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'general', -- general, promo, commission_boost, new_creative, launch
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own announcements" ON public.vendor_announcements FOR ALL USING (vendor_id = auth.uid() OR public.is_admin());
CREATE POLICY "Affiliates can view published announcements" ON public.vendor_announcements FOR SELECT USING (is_published = true);

-- 4. Promo Materials table
CREATE TABLE public.promo_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL DEFAULT 'copy', -- copy, banner, email_template
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promo materials" ON public.promo_materials FOR ALL USING (public.is_admin());
CREATE POLICY "Anyone can view active materials" ON public.promo_materials FOR SELECT USING (is_active = true);

-- 5. Affiliate Campaigns (UTM tracking)
CREATE TABLE public.affiliate_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can manage own campaigns" ON public.affiliate_campaigns FOR ALL USING (affiliate_id = auth.uid() OR public.is_admin());

-- 6. Product Rankings (computed scores)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ranking_score NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON public.commission_rules(is_active, rule_type);
CREATE INDEX IF NOT EXISTS idx_vendor_announcements_vendor ON public.vendor_announcements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_promo_materials_product ON public.promo_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_affiliate ON public.affiliate_campaigns(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_products_ranking ON public.products(ranking_score DESC);

-- 8. Triggers for updated_at
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_announcements_updated_at BEFORE UPDATE ON public.vendor_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_promo_materials_updated_at BEFORE UPDATE ON public.promo_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
