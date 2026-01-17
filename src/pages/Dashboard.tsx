import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useVendorStats, useAffiliateStats } from "@/hooks/useStats";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency } from "@/lib/format";
import { 
  Package, 
  ShoppingCart, 
  Wallet, 
  TrendingUp, 
  Link2, 
  MousePointer, 
  Target,
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RoleSelector } from "@/components/dashboard/RoleSelector";

export default function Dashboard() {
  const { user, roles, isVendor, isAffiliate } = useAuth();
  const { data: vendorStats, isLoading: vendorLoading } = useVendorStats(isVendor ? user?.id : undefined);
  const { data: affiliateStats, isLoading: affiliateLoading } = useAffiliateStats(isAffiliate ? user?.id : undefined);

  const hasNoRoles = !isVendor && !isAffiliate;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your account.
          </p>
        </motion.div>

        {/* Role Selector for new users */}
        {hasNoRoles && <RoleSelector />}

        {/* Vendor Stats */}
        {isVendor && vendorStats && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">Vendor Overview</h2>
              <Link to="/dashboard/products">
                <Button variant="ghost" size="sm">
                  View Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Total Products"
                  value={vendorStats.totalProducts}
                  subtitle={`${vendorStats.activeProducts} active`}
                  icon={Package}
                  variant="default"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Total Sales"
                  value={vendorStats.totalSales}
                  icon={ShoppingCart}
                  variant="primary"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(vendorStats.totalRevenue)}
                  icon={TrendingUp}
                  variant="success"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Withdrawable"
                  value={formatCurrency(vendorStats.withdrawableBalance)}
                  subtitle={`${formatCurrency(vendorStats.pendingEarnings)} pending`}
                  icon={Wallet}
                  variant="accent"
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Affiliate Stats */}
        {isAffiliate && affiliateStats && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">Affiliate Overview</h2>
              <Link to="/dashboard/links">
                <Button variant="ghost" size="sm">
                  Manage Links <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Active Links"
                  value={affiliateStats.totalLinks}
                  icon={Link2}
                  variant="default"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Total Clicks"
                  value={affiliateStats.totalClicks}
                  icon={MousePointer}
                  variant="primary"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Conversions"
                  value={affiliateStats.totalConversions}
                  subtitle={`${affiliateStats.conversionRate.toFixed(1)}% rate`}
                  icon={Target}
                  variant="success"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="Withdrawable"
                  value={formatCurrency(affiliateStats.withdrawableBalance)}
                  subtitle={`${formatCurrency(affiliateStats.pendingEarnings)} pending`}
                  icon={Wallet}
                  variant="accent"
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        {(isVendor || isAffiliate) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="mb-4 font-serif text-lg font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {isVendor && (
                <>
                  <Link to="/dashboard/products/new">
                    <Button>
                      <Package className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </Link>
                  <Link to="/dashboard/sales">
                    <Button variant="outline">View Sales</Button>
                  </Link>
                </>
              )}
              {isAffiliate && (
                <>
                  <Link to="/marketplace">
                    <Button>
                      <Link2 className="mr-2 h-4 w-4" />
                      Browse Products
                    </Button>
                  </Link>
                  <Link to="/dashboard/stats">
                    <Button variant="outline">View Analytics</Button>
                  </Link>
                </>
              )}
              <Link to="/dashboard/wallet">
                <Button variant="outline">
                  <Wallet className="mr-2 h-4 w-4" />
                  View Wallet
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
