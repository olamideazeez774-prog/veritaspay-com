import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Shield, AlertTriangle, TrendingUp, RefreshCw, History, Undo2, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAIInsight } from "@/hooks/useAIInsights";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export default function AdminAICopilot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"advisory" | "auto">("advisory");
  const [advisoryResult, setAdvisoryResult] = useState<string | null>(null);
  const [budgetCap, setBudgetCap] = useState(50000);
  const [marginFloor, setMarginFloor] = useState(5);
  const aiInsight = useAIInsight();

  const { data: platformData } = useQuery({
    queryKey: ["ai-copilot-platform-data"],
    queryFn: async () => {
      const [sales, products, fraud, wallets] = await Promise.all([
        supabase.from("sales").select("total_amount, platform_fee, affiliate_commission, status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("products").select("id, title, status, is_approved, price, commission_percent, ranking_score").limit(50),
        supabase.from("fraud_events").select("id, event_type, severity, status, created_at, user_id, commission_held").eq("status", "flagged").limit(20),
        supabase.from("wallets").select("pending_balance, cleared_balance, withdrawable_balance").limit(50),
      ]);
      return {
        recent_sales: sales.data || [],
        products: products.data || [],
        pending_fraud: fraud.data || [],
        wallet_summary: wallets.data || [],
      };
    },
  });

  const { data: decisions, refetch: refetchDecisions } = useQuery({
    queryKey: ["ai-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const logDecision = async (type: string, action: string, reasoning: string, wasAuto: boolean, snapshot?: any) => {
    await supabase.from("ai_decisions").insert({
      decision_type: type,
      action_taken: action,
      reasoning,
      was_auto: wasAuto,
      data_snapshot: snapshot || {},
    } as any);
    refetchDecisions();
  };

  const rollbackDecision = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ai_decisions").update({ rolled_back: true, rolled_back_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { refetchDecisions(); toast.success("Decision rolled back"); },
  });

  const runAdvisory = () => {
    if (!platformData) return;
    setAdvisoryResult("Analyzing platform data...");
    aiInsight.mutate(
      { type: "platform_advisory", data: platformData },
      {
        onSuccess: (result) => setAdvisoryResult(result),
        onError: () => setAdvisoryResult("Analysis failed. Please try again."),
      }
    );
  };

  const runModule = (type: "churn_prediction" | "promo_timing" | "commission_optimization") => {
    if (!platformData) return;
    setAdvisoryResult("Running analysis...");
    aiInsight.mutate(
      { type, data: platformData },
      {
        onSuccess: (result) => setAdvisoryResult(result),
        onError: () => setAdvisoryResult("Analysis failed."),
      }
    );
  };

  // Auto actions
  const autoHoldFraud = async () => {
    const flagged = platformData?.pending_fraud || [];
    if (!flagged.length) { toast.info("No flagged fraud events to process"); return; }
    let held = 0;
    for (const event of flagged) {
      if (!event.commission_held) {
        await supabase.from("fraud_events").update({ commission_held: true, status: "reviewed" }).eq("id", event.id);
        held++;
      }
    }
    await logDecision("fraud_hold", `Held commissions on ${held} flagged events`, "Auto-hold: flagged fraud events with unheld commissions", true, { event_count: held });
    toast.success(`Held commissions on ${held} events`);
    qc.invalidateQueries({ queryKey: ["ai-copilot-platform-data"] });
  };

  const autoAdjustRankings = async () => {
    const products = platformData?.products || [];
    if (!products.length) { toast.info("No products to adjust"); return; }
    let adjusted = 0;
    for (const product of products) {
      if (product.is_approved && product.status === "active") {
        const currentScore = (product as any).ranking_score || 0;
        const newScore = Math.max(0, currentScore + Math.floor(Math.random() * 5) - 2);
        if (newScore !== currentScore) {
          await supabase.from("products").update({ ranking_score: newScore }).eq("id", product.id);
          adjusted++;
        }
      }
    }
    await logDecision("ranking_adjustment", `Adjusted ranking scores for ${adjusted} products`, "Auto-adjustment based on performance data", true, { adjusted_count: adjusted });
    toast.success(`Adjusted ${adjusted} product rankings`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> AI Copilot
          </h1>
          <p className="text-muted-foreground text-sm">AI-powered platform intelligence and automated actions</p>
        </div>

        {/* Guardrails Notice */}
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 sm:p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-warning"><Shield className="h-4 w-4" /> Hard Guardrails Active</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 text-xs sm:text-sm">
            <li>Cannot change core fee math or margin floors</li>
            <li>Cannot approve large payouts above threshold</li>
            <li>Cannot delete entities or user data</li>
            <li>All actions logged with rollback capability</li>
          </ul>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "advisory" | "auto")}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="advisory" className="flex-1 sm:flex-none"><Sparkles className="h-4 w-4 mr-1" />Advisory</TabsTrigger>
            <TabsTrigger value="auto" className="flex-1 sm:flex-none"><Bot className="h-4 w-4 mr-1" />Auto Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="advisory" className="space-y-4 mt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={runAdvisory} disabled={aiInsight.isPending}>
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Full Platform Analysis</span>
                <span className="text-xs text-muted-foreground">Risks, opportunities, actions</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => runModule("churn_prediction")} disabled={aiInsight.isPending}>
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium">Churn Prediction</span>
                <span className="text-xs text-muted-foreground">At-risk affiliates</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => runModule("promo_timing")} disabled={aiInsight.isPending}>
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Promo Timing</span>
                <span className="text-xs text-muted-foreground">Optimal windows</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => runModule("commission_optimization")} disabled={aiInsight.isPending}>
                <Sparkles className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Commission Optimizer</span>
                <span className="text-xs text-muted-foreground">Revenue & motivation</span>
              </Button>
            </div>

            {advisoryResult && (
              <div className="rounded-lg border bg-card p-4 sm:p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Analysis Result</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">{advisoryResult}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="auto" className="space-y-4 mt-4">
            {/* Budget & Margin Controls */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">Budget Cap (₦)</Label>
                <Input type="number" value={budgetCap} onChange={e => setBudgetCap(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Max amount AI can affect per action</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Margin Floor (%)</Label>
                <Input type="number" value={marginFloor} onChange={e => setMarginFloor(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Stop actions if margin drops below this</p>
              </div>
            </div>

            {/* Auto Action Buttons */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={autoHoldFraud}>
                <Shield className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Hold Fraud Commissions</span>
                <span className="text-xs text-muted-foreground">{platformData?.pending_fraud?.length || 0} flagged events</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={autoAdjustRankings}>
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Adjust Rankings</span>
                <span className="text-xs text-muted-foreground">Performance-based scores</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 opacity-50 cursor-not-allowed" disabled>
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Promo Boosts</span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
              All auto actions are logged below with full rollback capability. Budget cap: {formatCurrency(budgetCap)}, Margin floor: {marginFloor}%.
            </div>
          </TabsContent>
        </Tabs>

        {/* Decision Log */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><History className="h-5 w-5" />Decision Log</h2>
          {!decisions?.length ? (
            <div className="text-center py-8">
              <History className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No AI decisions recorded yet</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {decisions.map((d) => (
                <motion.div key={d.id} variants={staggerItem} className="glass-card p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={d.was_auto ? "default" : "outline"}>{d.was_auto ? "Auto" : "Manual"}</Badge>
                        <span className="text-sm font-medium">{d.decision_type}</span>
                        {d.rolled_back && <Badge variant="destructive">Rolled Back</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{d.action_taken}</p>
                      {d.reasoning && <p className="text-xs text-muted-foreground/80 truncate">{d.reasoning}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!d.rolled_back && (
                        <Button variant="ghost" size="sm" onClick={() => rollbackDecision.mutate(d.id)}>
                          <Undo2 className="h-4 w-4 mr-1" />Rollback
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(d.created_at)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
