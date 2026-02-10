import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Shield, AlertTriangle, TrendingUp, RefreshCw, History } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAIInsight } from "@/hooks/useAIInsights";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateTime } from "@/lib/format";

export default function AdminAICopilot() {
  const [mode, setMode] = useState<"advisory" | "auto">("advisory");
  const [advisoryResult, setAdvisoryResult] = useState<string | null>(null);
  const aiInsight = useAIInsight();

  // Fetch platform data for AI analysis
  const { data: platformData } = useQuery({
    queryKey: ["ai-copilot-platform-data"],
    queryFn: async () => {
      const [sales, products, fraud, wallets] = await Promise.all([
        supabase.from("sales").select("total_amount, platform_fee, affiliate_commission, status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("products").select("id, title, status, is_approved, price, commission_percent").limit(50),
        supabase.from("fraud_events").select("event_type, severity, status, created_at").eq("status", "flagged").limit(20),
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

  // Fetch AI decision logs
  const { data: decisions } = useQuery({
    queryKey: ["ai-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
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
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-warning"><Shield className="h-4 w-4" /> Hard Guardrails Active</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
            <li>Cannot change core fee math or margin floors</li>
            <li>Cannot approve large payouts above threshold</li>
            <li>Cannot delete entities or user data</li>
            <li>All actions logged with rollback capability</li>
          </ul>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="advisory"><Sparkles className="h-4 w-4 mr-1" />Advisory Mode</TabsTrigger>
            <TabsTrigger value="auto"><Bot className="h-4 w-4 mr-1" />Auto Actions</TabsTrigger>
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
                <RefreshCw className="h-5 w-5 text-info" />
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
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Controlled Auto Mode</p>
              <p>When enabled, the AI will automatically execute safe actions only:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Hold commissions on flagged fraud events</li>
                <li>Apply promo boosts within configured budgets</li>
                <li>Adjust product rankings based on performance</li>
                <li>Send digest notifications to affiliates</li>
              </ul>
              <p className="mt-3 text-xs">All auto actions are logged below with full rollback capability.</p>
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
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={d.was_auto ? "default" : "outline"}>{d.was_auto ? "Auto" : "Manual"}</Badge>
                        <span className="text-sm font-medium">{d.decision_type}</span>
                        {d.rolled_back && <Badge variant="destructive">Rolled Back</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{d.action_taken}</p>
                      {d.reasoning && <p className="text-xs text-muted-foreground/80">{d.reasoning}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</span>
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
