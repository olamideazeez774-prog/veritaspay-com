import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const { data: entries, isLoading } = useLeaderboard(period);
  const { user } = useAuth();

  const myRank = entries?.findIndex(e => e.affiliate_id === user?.id);
  const myEntry = myRank !== undefined && myRank >= 0 ? entries![myRank] : null;

  const getMedalColor = (i: number) => i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top performers across the platform</p>
        </div>

        {myEntry && (
          <div className="glass-card p-4 border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground">Your rank</p>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-3">
                <Badge variant="default">#{myRank! + 1}</Badge>
                <span className="font-semibold text-sm">{myEntry.affiliate_name || "You"}</span>
              </div>
              <span className="font-bold text-success">{formatCurrency(myEntry.total_commission)}</span>
            </div>
          </div>
        )}

        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-none">Today</TabsTrigger>
            <TabsTrigger value="week" className="flex-1 sm:flex-none">Week</TabsTrigger>
            <TabsTrigger value="month" className="flex-1 sm:flex-none">Month</TabsTrigger>
            <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : !entries?.length ? (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No activity yet</h3>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {entries.slice(0, 50).map((entry, index) => (
              <motion.div key={entry.affiliate_id} variants={staggerItem} className={`glass-card p-4 ${entry.affiliate_id === user?.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
                      {index < 3 ? <Medal className={`h-5 w-5 ${getMedalColor(index)}`} /> : <span className="text-sm font-bold">{index + 1}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{entry.affiliate_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{entry.total_sales} sales · {formatPercent(entry.conversion_rate)} CR</p>
                    </div>
                  </div>
                  <p className="font-bold text-success shrink-0">{formatCurrency(entry.total_commission)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}