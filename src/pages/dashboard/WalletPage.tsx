import { motion } from "framer-motion";
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, useTransactions } from "@/hooks/useWallet";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Link } from "react-router-dom";
import { AnimatedLoading } from "@/components/ui/animated-loading";

export default function WalletPage() {
  const { user, profile } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet(user?.id);
  const { data: transactions, isLoading: transLoading } = useTransactions(wallet?.id);

  const isLoading = walletLoading || transLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <AnimatedLoading size="lg" text="Loading wallet..." />
        </div>
      </DashboardLayout>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sale_commission":
      case "sale_vendor":
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case "refund":
        return <ArrowUpRight className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "sale_commission":
        return "Commission";
      case "sale_vendor":
        return "Sale";
      case "withdrawal":
        return "Withdrawal";
      case "platform_fee":
        return "Platform Fee";
      case "refund":
        return "Refund";
      default:
        return type;
    }
  };

  const getEarningStateLabel = (state: string | null) => {
    switch (state) {
      case "pending":
        return { label: "Pending", variant: "secondary" as const };
      case "cleared":
        return { label: "Cleared", variant: "default" as const };
      case "withdrawable":
        return { label: "Available", variant: "outline" as const };
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with User Display */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
              <span className="text-sm text-muted-foreground border rounded-full px-3 py-1 bg-muted/50">
                {profile?.full_name || profile?.email || "User"}
              </span>
            </div>
            <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
          </div>
          <Link to="/dashboard/payouts">
            <Button>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </Link>
        </motion.div>

        {/* Balance Cards - Reordered: Withdrawable, Pending, Total Withdrawn, Cleared */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={staggerItem}>
            <StatCard
              title="Withdrawable"
              value={formatCurrency(wallet?.withdrawable_balance || 0)}
              subtitle="Available to withdraw"
              icon={Wallet}
              variant="success"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title="Pending"
              value={formatCurrency(wallet?.pending_balance || 0)}
              subtitle="Within refund window"
              icon={Clock}
              variant="default"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title="Total Withdrawn"
              value={formatCurrency(wallet?.total_withdrawn || 0)}
              subtitle="All time"
              icon={ArrowUpRight}
              variant="accent"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title="Cleared"
              value={formatCurrency(wallet?.cleared_balance || 0)}
              subtitle="Past refund window"
              icon={CheckCircle}
              variant="primary"
            />
          </motion.div>
        </motion.div>

        {/* Total Earned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 text-center"
        >
          <p className="text-sm text-muted-foreground">Total Earned (All Time)</p>
          <p className="mt-2 font-serif text-4xl font-bold text-gradient-primary">
            {formatCurrency(wallet?.total_earned || 0)}
          </p>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="border-b border-border p-4">
            <h2 className="font-serif text-xl font-semibold">Transaction History</h2>
          </div>

          {!transactions?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <Wallet className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => {
                const earningState = getEarningStateLabel(tx.earning_state);
                const isPositive = ["sale_commission", "sale_vendor"].includes(tx.type);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium">{getTransactionLabel(tx.type)}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.description || formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {earningState && (
                        <Badge variant={earningState.variant}>{earningState.label}</Badge>
                      )}
                      <span
                        className={`font-semibold ${
                          isPositive ? "text-success" : "text-destructive"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
