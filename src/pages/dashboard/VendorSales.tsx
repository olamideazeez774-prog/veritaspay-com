import { motion } from "framer-motion";
import { ShoppingCart, TrendingUp, Users, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useVendorStats } from "@/hooks/useStats";
import { useVendorSales } from "@/hooks/useSales";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { SALE_STATUS_LABELS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function VendorSales() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useVendorStats(user?.id);
  const { data: sales, isLoading: salesLoading } = useVendorSales(user?.id);

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "refunded":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Track your product sales and revenue</p>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={staggerItem}>
              <StatCard
                title="Total Sales"
                value={stats.totalSales}
                icon={ShoppingCart}
                variant="default"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Revenue"
                value={formatCurrency(stats.totalRevenue)}
                icon={TrendingUp}
                variant="primary"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Your Earnings"
                value={formatCurrency(
                  stats.pendingEarnings + stats.clearedEarnings + stats.withdrawableBalance
                )}
                icon={DollarSign}
                variant="success"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                title="Active Products"
                value={stats.activeProducts}
                subtitle={`of ${stats.totalProducts} total`}
                icon={Users}
                variant="accent"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Sales Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="border-b border-border p-4">
            <h2 className="font-serif text-xl font-semibold">Recent Sales</h2>
          </div>

          {!sales?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>No sales yet. Share your products to start selling!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Your Earnings</TableHead>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales?.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.products?.title}</TableCell>
                      <TableCell>{sale.buyer_email}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="font-semibold text-success">
                        {formatCurrency(sale.vendor_earnings)}
                      </TableCell>
                      <TableCell>
                        {sale.affiliate_id ? (
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(sale.affiliate_commission)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Direct</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(sale.status)}>
                          {SALE_STATUS_LABELS[sale.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sale.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
