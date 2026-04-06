import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MousePointer, Target, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateStats } from "@/hooks/useStats";
import { useAffiliateSales } from "@/hooks/useSales";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { SALE_STATUS_LABELS } from "@/lib/constants";

export default function AffiliateStats() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats(user?.id);
  const { data: sales, isLoading: salesLoading } = useAffiliateSales(user?.id);

  const isLoading = statsLoading || salesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your affiliate performance</p>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={staggerItem}>
              <StatCard
                title="Total Clicks"
                value={stats.totalClicks}
                icon={MousePointer}
                variant="default"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Total Conversions"
                value={stats.totalConversions}
                icon={Target}
                variant="primary"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Conversion Rate"
                value={`${stats.conversionRate.toFixed(1)}%`}
                icon={TrendingUp}
                variant="success"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Total Earnings"
                value={formatCurrency(
                  stats.pendingEarnings + stats.clearedEarnings + stats.withdrawableBalance
                )}
                subtitle={`${formatCurrency(stats.withdrawableBalance)} available`}
                icon={Wallet}
                variant="accent"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Earnings Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="mb-4 font-serif text-xl font-semibold">Earnings Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="neu-inset rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-bold text-warning">
                {formatCurrency(stats?.pendingEarnings || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Within refund window</p>
            </div>
            <div className="neu-inset rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Cleared</p>
              <p className="mt-1 text-2xl font-bold text-success">
                {formatCurrency(stats?.clearedEarnings || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Ready to withdraw</p>
            </div>
            <div className="neu-inset rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Withdrawable</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatCurrency(stats?.withdrawableBalance || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Available balance</p>
            </div>
          </div>
        </motion.div>

        {/* Recent Conversions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="border-b border-border p-4">
            <h2 className="font-serif text-xl font-semibold">Recent Conversions</h2>
          </div>
          {!(sales && 'sales' in sales ? sales.sales : sales)?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>No conversions yet. Keep promoting!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(sales && 'sales' in sales ? sales.sales : (sales as any))?.slice(0, 10).map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{sale.products?.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">
                      +{formatCurrency(sale.affiliate_commission)}
                    </p>
                    <Badge
                      variant={
                        sale.status === "completed"
                          ? "default"
                          : sale.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {SALE_STATUS_LABELS[sale.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
