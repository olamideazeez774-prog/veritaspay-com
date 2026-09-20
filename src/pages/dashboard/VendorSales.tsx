import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, TrendingUp, Users, DollarSign, Plus, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useVendorStats } from "@/hooks/useStats";
import { useVendorSales, useProcessRefund } from "@/hooks/useSales";
import { useWallet } from "@/hooks/useWallet";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { data: wallet } = useWallet(user?.id);
  const processRefund = useProcessRefund();
  const [refundTarget, setRefundTarget] = useState<{ id: string; title: string } | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const submitRefund = () => {
    if (!refundTarget) return;
    processRefund.mutate(
      { saleId: refundTarget.id, reason: refundReason.trim() || undefined },
      { onSettled: () => {
        setRefundTarget(null);
        setRefundReason("");
      } },
    );
  };

  const isRefundEligible = (sale: { status: string; refund_eligible_until?: string | null }) =>
    sale.status === "completed" &&
    !!sale.refund_eligible_until &&
    new Date(sale.refund_eligible_until) > new Date();

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
                value={formatCurrency(wallet?.total_earned || 0)}
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
            <EmptyState
              icon={ShoppingCart}
              title="No sales yet"
              description="Share your products to start making sales. Create your first product to begin selling."
              action={
                <Link to="/dashboard/products/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Product
                  </Button>
                </Link>
              }
            />
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        {isRefundEligible(sale) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={processRefund.isPending}
                            onClick={() => setRefundTarget({ id: sale.id, title: sale.products?.title || "this sale" })}
                          >
                            <Undo2 className="mr-1 h-4 w-4" />
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Refund confirmation */}
      <AlertDialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund “{refundTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The buyer's money is returned via Paystack and all wallet credits for this sale
              are reversed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason (optional, shared with the buyer)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processRefund.isPending}
              onClick={(e) => {
                e.preventDefault();
                submitRefund();
              }}
            >
              {processRefund.isPending ? "Processing…" : "Process refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
