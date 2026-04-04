import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AdminLeaderboard() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const { data: entries, isLoading } = useLeaderboard(period);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-yellow-500";
      case 1: return "text-gray-400";
      case 2: return "text-amber-700";
      default: return "text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliate Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top performing affiliates by commission earned</p>
        </div>

        <Tabs value={period} onValueChange={(v: "today" | "week" | "month" | "all") => setPeriod(v)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" text="Loading leaderboard..." /></div>
        ) : !entries?.length ? (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No activity for this period</h3>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {entries.map((entry, index) => (
              <motion.div key={entry.affiliate_id} variants={staggerItem} className="glass-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      {index < 3 ? (
                        <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{entry.affiliate_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{entry.affiliate_email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-success">{formatCurrency(entry.total_commission)}</p>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{entry.total_sales}</p>
                      <p className="text-xs text-muted-foreground">Sales</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{entry.total_clicks}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-primary">{formatPercent(entry.conversion_rate)}</p>
                      <p className="text-xs text-muted-foreground">Conv Rate</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
