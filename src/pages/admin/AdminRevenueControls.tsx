import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Save, Percent, CreditCard, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PlatformSettings {
  default_platform_fee: number;
  default_commission: number;
  min_withdrawal: number;
  featured_listing_fee: number;
  sponsored_slot_fee: number;
  payout_cycle_days: number;
  auto_payout_enabled: boolean;
  processing_buffer_fee: number;
  withdrawal_fee_percent: number;
  withdrawal_flat_fee: number;
  verification_badge_fee: number;
  premium_vendor_fee_reduction: number;
  premium_vendor_monthly_cost: number;
  ai_fraud_detection: boolean;
  ai_affiliate_coaching: boolean;
  ai_product_matching: boolean;
  ai_commission_optimization: boolean;
  transparent_ledger_enabled: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  default_platform_fee: 10,
  default_commission: 30,
  min_withdrawal: 5000,
  featured_listing_fee: 10000,
  sponsored_slot_fee: 25000,
  payout_cycle_days: 7,
  auto_payout_enabled: false,
  processing_buffer_fee: 0,
  withdrawal_fee_percent: 0,
  withdrawal_flat_fee: 0,
  verification_badge_fee: 5000,
  premium_vendor_fee_reduction: 3,
  premium_vendor_monthly_cost: 15000,
  ai_fraud_detection: true,
  ai_affiliate_coaching: true,
  ai_product_matching: true,
  ai_commission_optimization: true,
  transparent_ledger_enabled: true,
};

export default function AdminRevenueControls() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["revenue_controls", "ai_modules", "micro_fees", "vendor_tiers"]);
      if (data) {
        data.forEach((d) => {
          if (d.value && typeof d.value === "object") {
            setSettings((prev) => ({ ...prev, ...(d.value as any) }));
          }
        });
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const {
        ai_fraud_detection, ai_affiliate_coaching, ai_product_matching, ai_commission_optimization,
        processing_buffer_fee, withdrawal_fee_percent, withdrawal_flat_fee, verification_badge_fee,
        premium_vendor_fee_reduction, premium_vendor_monthly_cost,
        transparent_ledger_enabled,
        ...revenueSettings
      } = settings;

      await Promise.all([
        supabase.from("platform_settings").upsert({ key: "revenue_controls", value: revenueSettings as any, updated_by: user?.id }, { onConflict: "key" }),
        supabase.from("platform_settings").upsert({ key: "ai_modules", value: { ai_fraud_detection, ai_affiliate_coaching, ai_product_matching, ai_commission_optimization } as any, updated_by: user?.id }, { onConflict: "key" }),
        supabase.from("platform_settings").upsert({ key: "micro_fees", value: { processing_buffer_fee, withdrawal_fee_percent, withdrawal_flat_fee, verification_badge_fee } as any, updated_by: user?.id }, { onConflict: "key" }),
        supabase.from("platform_settings").upsert({ key: "vendor_tiers", value: { premium_vendor_fee_reduction, premium_vendor_monthly_cost, transparent_ledger_enabled } as any, updated_by: user?.id }, { onConflict: "key" }),
      ]);

      await supabase.rpc("write_system_log", {
        _event_type: "revenue_settings_updated",
        _category: "system",
        _description: "Platform revenue and fee settings updated",
        _actor_id: user?.id,
        _status: "updated",
      });

      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div></DashboardLayout>;

  const NumberField = ({ label, fieldKey }: { label: string; fieldKey: keyof PlatformSettings }) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Input type="number" value={(settings as any)[fieldKey]} onChange={(e) => setSettings({ ...settings, [fieldKey]: Number(e.target.value) })} />
    </div>
  );

  const ToggleField = ({ label, desc, fieldKey }: { label: string; desc: string; fieldKey: keyof PlatformSettings }) => (
    <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 min-h-[44px]">
      <div className="flex-1 min-w-0 mr-3">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={(settings as any)[fieldKey]} onCheckedChange={(v) => setSettings({ ...settings, [fieldKey]: v })} />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Revenue & AI Controls</h1>
            <p className="text-muted-foreground text-sm">Configure platform fees, payouts, vendor tiers, and AI modules</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="min-h-[44px] w-full sm:w-auto sm:self-end">
            <Save className="h-4 w-4 mr-2" />{isSaving ? "Saving..." : "Save All"}
          </Button>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6 space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Core Revenue</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Default Platform Fee (%)" fieldKey="default_platform_fee" />
              <NumberField label="Default Commission (%)" fieldKey="default_commission" />
              <NumberField label="Min Withdrawal (₦)" fieldKey="min_withdrawal" />
              <NumberField label="Featured Listing Fee (₦)" fieldKey="featured_listing_fee" />
              <NumberField label="Sponsored Slot Fee (₦)" fieldKey="sponsored_slot_fee" />
              <NumberField label="Payout Cycle (days)" fieldKey="payout_cycle_days" />
            </div>
            <ToggleField label="Auto-process payouts" desc="Automatically process payouts on cycle" fieldKey="auto_payout_enabled" />
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6 space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Micro & Maintenance Fees</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Processing Buffer Fee (₦)" fieldKey="processing_buffer_fee" />
              <NumberField label="Withdrawal Fee (%)" fieldKey="withdrawal_fee_percent" />
              <NumberField label="Withdrawal Flat Fee (₦)" fieldKey="withdrawal_flat_fee" />
              <NumberField label="Verification Badge Fee (₦)" fieldKey="verification_badge_fee" />
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6 space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Vendor Tier Configuration</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <NumberField label="Premium Fee Reduction (%)" fieldKey="premium_vendor_fee_reduction" />
              <NumberField label="Premium Monthly Cost (₦)" fieldKey="premium_vendor_monthly_cost" />
            </div>
            <ToggleField label="Transparent Ledger" desc="Show full fee breakdown to vendors and affiliates" fieldKey="transparent_ledger_enabled" />
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6 space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />AI Modules</h2>
            <div className="space-y-3">
              <ToggleField label="Fraud Pattern Detection" desc="AI-powered fraud scoring and anomaly detection" fieldKey="ai_fraud_detection" />
              <ToggleField label="Affiliate Performance Coaching" desc="Personalized suggestions to improve performance" fieldKey="ai_affiliate_coaching" />
              <ToggleField label="Smart Product Matching" desc="Match affiliates with high-converting products" fieldKey="ai_product_matching" />
              <ToggleField label="Commission Optimization" desc="Dynamic commission suggestions based on market data" fieldKey="ai_commission_optimization" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
