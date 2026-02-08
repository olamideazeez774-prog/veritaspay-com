import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Save, Settings } from "lucide-react";
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
  ai_fraud_detection: boolean;
  ai_affiliate_coaching: boolean;
  ai_product_matching: boolean;
  ai_commission_optimization: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  default_platform_fee: 10,
  default_commission: 30,
  min_withdrawal: 5000,
  featured_listing_fee: 10000,
  sponsored_slot_fee: 25000,
  payout_cycle_days: 7,
  auto_payout_enabled: false,
  ai_fraud_detection: true,
  ai_affiliate_coaching: true,
  ai_product_matching: true,
  ai_commission_optimization: true,
};

export default function AdminRevenueControls() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from("platform_settings").select("key, value").in("key", ["revenue_controls", "ai_modules"]);
      if (data) {
        const revenue = data.find(d => d.key === "revenue_controls");
        const ai = data.find(d => d.key === "ai_modules");
        if (revenue) setSettings(prev => ({ ...prev, ...(revenue.value as any) }));
        if (ai) setSettings(prev => ({ ...prev, ...(ai.value as any) }));
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { ai_fraud_detection, ai_affiliate_coaching, ai_product_matching, ai_commission_optimization, ...revenueSettings } = settings;
      
      // Upsert revenue controls
      await supabase.from("platform_settings").upsert({ key: "revenue_controls", value: revenueSettings as any, updated_by: user?.id }, { onConflict: "key" });
      // Upsert AI module settings
      await supabase.from("platform_settings").upsert({ key: "ai_modules", value: { ai_fraud_detection, ai_affiliate_coaching, ai_product_matching, ai_commission_optimization } as any, updated_by: user?.id }, { onConflict: "key" });
      
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Revenue & AI Controls</h1>
            <p className="text-muted-foreground text-sm">Configure platform fees, payouts, and AI modules</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />{isSaving ? "Saving..." : "Save All"}
          </Button>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          {/* Revenue Controls */}
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Revenue Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "default_platform_fee", label: "Default Platform Fee (%)", type: "number" },
                { key: "default_commission", label: "Default Commission (%)", type: "number" },
                { key: "min_withdrawal", label: "Min Withdrawal (₦)", type: "number" },
                { key: "featured_listing_fee", label: "Featured Listing Fee (₦)", type: "number" },
                { key: "sponsored_slot_fee", label: "Sponsored Slot Fee (₦)", type: "number" },
                { key: "payout_cycle_days", label: "Payout Cycle (days)", type: "number" },
              ].map(field => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input type="number" value={(settings as any)[field.key]} onChange={e => setSettings({...settings, [field.key]: Number(e.target.value)})} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={settings.auto_payout_enabled} onCheckedChange={v => setSettings({...settings, auto_payout_enabled: v})} />
              <Label>Auto-process payouts</Label>
            </div>
          </motion.div>

          {/* AI Module Controls */}
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />AI Modules</h2>
            <div className="space-y-4">
              {[
                { key: "ai_fraud_detection", label: "Fraud Pattern Detection", desc: "AI-powered fraud scoring and anomaly detection" },
                { key: "ai_affiliate_coaching", label: "Affiliate Performance Coaching", desc: "Personalized suggestions to improve affiliate performance" },
                { key: "ai_product_matching", label: "Smart Product Matching", desc: "Match affiliates with high-converting products" },
                { key: "ai_commission_optimization", label: "Commission Optimization", desc: "Dynamic commission suggestions based on market data" },
              ].map(mod => (
                <div key={mod.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.desc}</p>
                  </div>
                  <Switch checked={(settings as any)[mod.key]} onCheckedChange={v => setSettings({...settings, [mod.key]: v})} />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
