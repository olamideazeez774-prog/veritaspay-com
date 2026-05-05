import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ToggleLeft, RotateCcw, Clock, User, MessageSquare, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
  changedBy?: string;
  changedAt?: string;
  reason?: string;
  previousValue?: boolean;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "listing_fees", label: "Listing Fees", description: "Charge vendors to list products", category: "Revenue", enabled: true },
  { key: "platform_fees", label: "Platform Fees", description: "Deduct platform fee from each sale", category: "Revenue", enabled: true },
  { key: "withdrawal_fees", label: "Withdrawal Fees", description: "Charge fees on payout withdrawals", category: "Revenue", enabled: false },
  { key: "promo_campaigns", label: "Promo Campaigns", description: "Enable promotional campaign system", category: "Marketing", enabled: true },
  { key: "ai_modules", label: "AI Modules", description: "Enable AI-powered analytics and fraud detection", category: "AI", enabled: true },
  { key: "commission_boosts", label: "Commission Boosts", description: "Allow time-limited commission rate increases", category: "Commission", enabled: true },
  { key: "vendor_onboarding", label: "Vendor Onboarding Mode", description: "Show guided setup for new vendors", category: "Experience", enabled: true },
  { key: "affiliate_rewards", label: "Affiliate Reward Programs", description: "Enable rank ladder and streak rewards", category: "Affiliate", enabled: true },
  { key: "ranking_algorithm", label: "Ranking Algorithm", description: "Use automated marketplace product ranking", category: "Marketplace", enabled: true },
  { key: "experiments", label: "Experiment Features", description: "Allow A/B testing of platform variables", category: "Advanced", enabled: false },
  { key: "affiliate_toolkit", label: "Affiliate Toolkit", description: "Show QR, UTM, promo material, and AI toolkit pages", category: "Affiliate", enabled: true },
  { key: "certificates", label: "Certificates", description: "Allow users to claim and view achievement certificates", category: "Affiliate", enabled: true },
  { key: "daily_digest", label: "Daily Digest", description: "Show automated daily digest pages and navigation", category: "Experience", enabled: true },
  { key: "leaderboard", label: "Leaderboard", description: "Show leaderboard navigation and admin leaderboard tools", category: "Affiliate", enabled: true },
];

export default function AdminFeatureFlags() {
  const { user, profile } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const [reasonDialog, setReasonDialog] = useState<{ key: string; newValue: boolean } | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("key", "feature_flags")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const saved = data.value as Record<string, { enabled?: boolean; changedBy?: string; changedAt?: string; reason?: string; previousValue?: boolean }>;
      setFlags((prev) =>
        prev.map((f) => ({
          ...f,
          enabled: saved[f.key]?.enabled ?? f.enabled,
          changedBy: saved[f.key]?.changedBy,
          changedAt: saved[f.key]?.changedAt,
          reason: saved[f.key]?.reason,
          previousValue: saved[f.key]?.previousValue,
        }))
      );
    }
    setIsLoading(false);
  };

  const handleToggle = (key: string, newValue: boolean) => {
    setReasonDialog({ key, newValue });
    setReason("");
  };

  const confirmToggle = async () => {
    if (!reasonDialog) return;
    const { key, newValue } = reasonDialog;

    const updatedFlags = flags.map((f) =>
      f.key === key
        ? {
            ...f,
            enabled: newValue,
            previousValue: f.enabled,
            changedBy: profile?.email || "admin",
            changedAt: new Date().toISOString(),
            reason: reason || "No reason provided",
          }
        : f
    );
    setFlags(updatedFlags);
    setReasonDialog(null);

    const flagsObj: Record<string, { enabled: boolean; changedBy?: string; changedAt?: string; reason?: string; previousValue?: boolean }> = {};
    updatedFlags.forEach((f) => {
      flagsObj[f.key] = {
        enabled: f.enabled,
        changedBy: f.changedBy,
        changedAt: f.changedAt,
        reason: f.reason,
        previousValue: f.previousValue,
      };
    });

    await (supabase.from("platform_settings") as unknown as { upsert: (data: Record<string, unknown>, opts: { onConflict: string }) => Promise<unknown> }).upsert(
      { key: "feature_flags", value: flagsObj, updated_by: user?.id },
      { onConflict: "key" }
    );

    // Log to system_logs
    await supabase.rpc("write_system_log", {
      _event_type: "feature_flag_changed",
      _category: "system",
      _description: `Feature flag "${key}" ${newValue ? "enabled" : "disabled"}: ${reason || "No reason"}`,
      _actor_id: user?.id,
      _related_id: key,
      _related_type: "feature_flag",
      _status: newValue ? "enabled" : "disabled",
    });

    toast.success(`${key.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}`);
  };

  const handleRollback = async (key: string) => {
    const flag = flags.find((f) => f.key === key);
    if (!flag || flag.previousValue === undefined) return;

    const updatedFlags = flags.map((f) =>
      f.key === key
        ? {
            ...f,
            enabled: flag.previousValue!,
            previousValue: flag.enabled,
            changedBy: profile?.email || "admin",
            changedAt: new Date().toISOString(),
            reason: "Rollback to previous value",
          }
        : f
    );
    setFlags(updatedFlags);

    const flagsObj: Record<string, { enabled: boolean; changedBy?: string; changedAt?: string; reason?: string; previousValue?: boolean }> = {};
    updatedFlags.forEach((f) => {
      flagsObj[f.key] = {
        enabled: f.enabled,
        changedBy: f.changedBy,
        changedAt: f.changedAt,
        reason: f.reason,
        previousValue: f.previousValue,
      };
    });

    await (supabase.from("platform_settings") as unknown as { upsert: (data: Record<string, unknown>, opts: { onConflict: string }) => Promise<unknown> }).upsert(
      { key: "feature_flags", value: flagsObj as Record<string, unknown>, updated_by: user?.id },
      { onConflict: "key" }
    );

    await supabase.rpc("write_system_log", {
      _event_type: "feature_flag_changed",
      _category: "system",
      _description: `Feature flag "${key}" rolled back to ${flag.previousValue ? "enabled" : "disabled"}`,
      _actor_id: user?.id,
      _related_id: key,
      _related_type: "feature_flag",
      _status: "rollback",
    });

    toast.success(`Rolled back ${key.replace(/_/g, " ")}`);
  };

  const exportCSV = () => {
    const rows = [["Flag", "Status", "Changed By", "Changed At", "Reason"].join(",")];
    flags.forEach(f => {
      rows.push([f.label, f.enabled ? "ON" : "OFF", f.changedBy || "", f.changedAt || "", `"${f.reason || ""}"`].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feature-flags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported flag history");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
      </DashboardLayout>
    );
  }

  const categories = [...new Set(flags.map((f) => f.category))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <ToggleLeft className="h-7 w-7 text-primary" />
              Feature Flags
            </h1>
            <p className="text-muted-foreground text-sm">Toggle platform features on/off with full audit trail</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />Export CSV
          </Button>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          {categories.map((cat) => (
            <motion.div key={cat} variants={staggerItem} className="glass-card p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold">{cat}</h2>
              <div className="space-y-3">
                {flags
                  .filter((f) => f.category === cat)
                  .map((flag) => (
                    <div
                      key={flag.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm">{flag.label}</p>
                          <Badge variant={flag.enabled ? "default" : "secondary"} className="text-xs">
                            {flag.enabled ? "ON" : "OFF"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                        {flag.changedAt && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />{flag.changedBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{formatDate(flag.changedAt)}
                            </span>
                            {flag.reason && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <MessageSquare className="h-3 w-3 shrink-0" />{flag.reason}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {flag.previousValue !== undefined && (
                          <Button variant="ghost" size="sm" onClick={() => handleRollback(flag.key)} title="Rollback" className="min-h-[44px] min-w-[44px]">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(v) => handleToggle(flag.key, v)}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Dialog open={!!reasonDialog} onOpenChange={() => setReasonDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reasonDialog?.newValue ? "Enable" : "Disable"} Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for change (optional)</Label>
            <Textarea
              placeholder="Why are you making this change?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>Cancel</Button>
            <Button onClick={confirmToggle}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
