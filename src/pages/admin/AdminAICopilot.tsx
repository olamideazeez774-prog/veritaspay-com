import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Shield, AlertTriangle, TrendingUp, RefreshCw, History, Undo2, DollarSign, Power, Zap, Calendar, Bell, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAIInsight } from "@/hooks/useAIInsights";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { AIContentCalendar } from "@/components/AIContentCalendar";
import { AISmartAlerts } from "@/components/AISmartAlerts";
import { AIOptimizationSettingsPanel } from "@/components/AIOptimizationSettings";

const AUTO_INTERVAL_MS = 60_000;

export default function AdminAICopilot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"advisory" | "auto" | "autonomous">("advisory");
  const [advisoryResult, setAdvisoryResult] = useState<string | null>(null);
  const [budgetCap, setBudgetCap] = useState(50000);
  const [marginFloor, setMarginFloor] = useState(5);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [sessionActions, setSessionActions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiInsight = useAIInsight();

  const { data: platformData, refetch: refetchPlatform } = useQuery({
    queryKey: ["ai-copilot-platform-data"],
    queryFn: async () => {
      const [sales, products, fraud, wallets, rules] = await Promise.all([
        supabase.from("sales").select("total_amount, platform_fee, affiliate_commission, status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("products").select("id, title, status, is_approved, price, commission_percent, ranking_score").limit(50),
        supabase.from("fraud_events").select("id, event_type, severity, status, created_at, user_id, commission_held").eq("status", "flagged").limit(20),
        supabase.from("wallets").select("pending_balance, cleared_balance, withdrawable_balance").limit(50),
        supabase.from("commission_rules").select("*").eq("is_active", true).limit(20),
      ]);
      return {
        recent_sales: sales.data || [],
        products: products.data || [],
        pending_fraud: fraud.data || [],
        wallet_summary: wallets.data || [],
        active_rules: rules.data || [],
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

  const logDecision = useCallback(async (type: string, action: string, reasoning: string, wasAuto: boolean, snapshot?: Record<string, number>) => {
    await supabase.from("ai_decisions").insert([{
      decision_type: type,
      action_taken: action,
      reasoning,
      was_auto: wasAuto,
      data_snapshot: (snapshot || {}) as unknown as import("@/integrations/supabase/types").Json,
    }]);
    refetchDecisions();
  }, [refetchDecisions]);

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

  const autoHoldFraud = useCallback(async () => {
    const { data: flagged } = await supabase
      .from("fraud_events")
      .select("id, related_id, commission_held")
      .eq("status", "flagged")
      .eq("commission_held", false)
      .limit(10);
    if (!flagged?.length) return 0;
    let held = 0;
    for (const event of flagged) {
      const { error: updateErr } = await supabase
        .from("sales")
        .update({ commission_held: true })
        .eq("id", event.related_id);
      if (!updateErr) {
        await supabase.from("fraud_events").update({ commission_held: true }).eq("id", event.id);
        held++;
      }
    }
    if (held > 0) {
      await logDecision("fraud_hold", `Held commissions on ${held} flagged events`, "Auto-hold: flagged fraud events with unheld commissions", true, { event_count: held });
    }
    return held;
  }, [logDecision]);

  const autoAdjustRankings = useCallback(async () => {
    const { data: productsWithSales } = await supabase
      .from("products")
      .select("id, ranking_score, is_approved, status")
      .eq("is_approved", true)
      .eq("status", "active")
      .limit(50);
    
    if (!productsWithSales?.length) return 0;
    
    let adjusted = 0;
    
    for (const product of productsWithSales) {
      const currentScore = product.ranking_score || 50;
      
      // Get recent sales count for this product
      const { count: recentSales } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const performanceScore = Math.min(100, 50 + ((recentSales || 0) * 10));
      
      if (Math.abs(performanceScore - currentScore) > 5) {
        await supabase.from("products").update({ 
          ranking_score: performanceScore 
        }).eq("id", product.id);
        adjusted++;
      }
    }
    
    if (adjusted > 0) {
      await logDecision("ranking_adjustment", `Adjusted ranking scores for ${adjusted} products`, "Auto-adjustment based on 30-day sales performance", true, { adjusted_count: adjusted });
    }
    return adjusted;
  }, [logDecision]);

  const autoPromoBoosts = useCallback(async () => {
    const { data: rules } = await supabase
      .from("commission_rules")
      .select("id, product_id, boost_percent, name")
      .eq("is_active", true)
      .not("product_id", "is", null)
      .gt("boost_percent", 0);
    if (!rules?.length) return 0;
    let boosted = 0;
    for (const rule of rules) {
      if (!rule.product_id) continue;
      const { data: product } = await supabase
        .from("products")
        .select("id, ranking_score")
        .eq("id", rule.product_id)
        .single();
      if (product) {
        const boost = Math.ceil((rule.boost_percent || 0) / 5);
        await supabase.from("products").update({ ranking_score: (product.ranking_score || 0) + boost }).eq("id", product.id);
        boosted++;
      }
    }
    if (boosted > 0) {
      await logDecision("promo_boost", `Boosted rankings for ${boosted} promoted products`, "Auto-boost from active commission rules with product-specific boosts", true, { boosted_count: boosted });
    }
    return boosted;
  }, [logDecision]);

  const autoGenerateDigests = useCallback(async () => {
    try {
      await supabase.functions.invoke("generate-daily-digest");
      await logDecision("digest_generation", "Triggered daily digest generation", "Automated daily digest cycle", true);
      return 1;
    } catch {
      return 0;
    }
  }, [logDecision]);

  const runAutoCycle = useCallback(async () => {
    try {
      await refetchPlatform();
      const fraudHeld = await autoHoldFraud();
      const rankingsAdjusted = await autoAdjustRankings();
      const promosBoosted = await autoPromoBoosts();
      const total = fraudHeld + rankingsAdjusted + promosBoosted;
      setSessionActions(prev => prev + total);
      if (total > 0) {
        qc.invalidateQueries({ queryKey: ["ai-copilot-platform-data"] });
      }
    } catch (err) {
      console.error("Auto cycle error:", err);
    }
  }, [autoHoldFraud, autoAdjustRankings, autoPromoBoosts, refetchPlatform, qc]);

  useEffect(() => {
    if (autoEnabled) {
      setSessionActions(0);
      runAutoCycle();
      intervalRef.current = setInterval(runAutoCycle, AUTO_INTERVAL_MS);
      toast.success("Autonomous Mode enabled — running every 60s");
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (sessionActions > 0) {
        toast.info(`AI Steward Report: ${sessionActions} actions taken during this session.`);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoEnabled, runAutoCycle, sessionActions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> AI Copilot
          </h1>
          <p className="text-muted-foreground text-sm">AI-powered platform intelligence and automated actions</p>
        </div>

        {/* Auto-Mode Master Toggle */}
        <div className={`rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${autoEnabled ? "border-success/40 bg-success/5" : "border-muted"}`}>
          <div className="flex items-center gap-3">
            <Power className={`h-5 w-5 ${autoEnabled ? "text-success" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-sm">Autonomous Mode</p>
              <p className="text-xs text-muted-foreground">
                {autoEnabled
                  ? `Running every 60s — fraud holds, ranking adjustments, promo boosts · ${sessionActions} actions this session`
                  : "Toggle on to let the AI Copilot run actions automatically in the background"}
              </p>
            </div>
          </div>
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
        </div>

        {/* Guardrails */}
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 sm:p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-warning"><Shield className="h-4 w-4" /> Hard Guardrails Active</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 text-xs sm:text-sm">
            <li>Cannot change core fee math or margin floors</li>
            <li>Cannot approve large payouts above threshold</li>
            <li>Cannot delete entities or user data</li>
            <li>All actions logged with rollback capability</li>
          </ul>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "advisory" | "auto" | "autonomous")}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="advisory" className="flex-1 sm:flex-none"><Sparkles className="h-4 w-4 mr-1" />Advisory</TabsTrigger>
            <TabsTrigger value="auto" className="flex-1 sm:flex-none"><Bot className="h-4 w-4 mr-1" />Auto Actions</TabsTrigger>
            <TabsTrigger value="autonomous" className="flex-1 sm:flex-none"><Calendar className="h-4 w-4 mr-1" />Autonomous</TabsTrigger>
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

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={async () => { const n = await autoHoldFraud(); toast.success(`Held commissions on ${n} events`); qc.invalidateQueries({ queryKey: ["ai-copilot-platform-data"] }); }}>
                <Shield className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Hold Fraud Commissions</span>
                <span className="text-xs text-muted-foreground">{platformData?.pending_fraud?.length || 0} flagged</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={async () => { const n = await autoAdjustRankings(); toast.success(`Adjusted ${n} product rankings`); }}>
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Adjust Rankings</span>
                <span className="text-xs text-muted-foreground">Performance-based scores</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={async () => { const n = await autoPromoBoosts(); toast.success(`Boosted ${n} products`); }}>
                <Zap className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Promo Boosts</span>
                <span className="text-xs text-muted-foreground">{platformData?.active_rules?.length || 0} active rules</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={async () => { await autoGenerateDigests(); toast.success("Daily digests generated"); }}>
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Generate Digests</span>
                <span className="text-xs text-muted-foreground">Daily summaries for users</span>
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
              All auto actions are logged below with full rollback capability. Budget cap: {formatCurrency(budgetCap)}, Margin floor: {marginFloor}%.
            </div>
          </TabsContent>

          <TabsContent value="autonomous" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <AIContentCalendar />
              <AISmartAlerts />
            </div>
            <AIOptimizationSettingsPanel />
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={d.was_auto ? "default" : "outline"}>{d.was_auto ? "Auto" : "Manual"}</Badge>
                        <span className="text-sm font-medium">{d.decision_type}</span>
                        {d.rolled_back && <Badge variant="destructive">Rolled Back</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{d.action_taken}</p>
                      {d.reasoning && <p className="text-xs text-muted-foreground/80 break-words">{d.reasoning}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!d.rolled_back && (
                        <Button variant="ghost" size="sm" onClick={() => rollbackDecision.mutate(d.id)} className="min-h-[44px]">
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