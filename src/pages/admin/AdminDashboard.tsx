import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Package, DollarSign, TrendingUp, Wallet, FileCheck,
  ArrowUpRight, BarChart3, BookOpen,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminStats } from "@/hooks/useStats";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  const quickActions = [
    { title: "Analytics", description: "View operational metrics and charts", icon: BarChart3, href: "/vp-admin-x7k9/analytics", color: "text-info" },
    { title: "System Logbook", description: "View comprehensive activity ledger", icon: BookOpen, href: "/vp-admin-x7k9/logbook", color: "text-primary" },
    { title: "Review Products", description: "Approve or reject pending products", icon: FileCheck, href: "/vp-admin-x7k9/products", color: "text-primary" },
    { title: "Listing Payments", description: "Verify vendor listing payments", icon: DollarSign, href: "/vp-admin-x7k9/listing-payments", color: "text-success" },
    { title: "Process Payouts", description: "Handle withdrawal requests", icon: Wallet, href: "/vp-admin-x7k9/payouts", color: "text-warning" },
    { title: "Manage Users", description: "View and manage user accounts", icon: Users, href: "/vp-admin-x7k9/users", color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform overview and management</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
            {/* Stats Grid */}
            <motion.div variants={staggerItem} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} icon={DollarSign} trend={{ value: 12, isPositive: true }} />
              <StatCard title="Platform Earnings" value={formatCurrency(stats?.platformEarnings || 0)} icon={TrendingUp} trend={{ value: 8, isPositive: true }} />
              <StatCard title="Total Products" value={stats?.totalProducts?.toString() || "0"} icon={Package} />
              <StatCard title="Total Users" value={stats?.totalUsers?.toString() || "0"} icon={Users} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={staggerItem}>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {quickActions.map((action) => (
                  <Link key={action.title} to={action.href}>
                    <div className="glass-card p-4 sm:p-6 hover-lift group cursor-pointer h-full">
                      <div className="flex items-start justify-between">
                        <div className={`rounded-full bg-muted p-2 sm:p-3 ${action.color}`}>
                          <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="mt-3 font-semibold text-sm sm:text-base">{action.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Pending Items */}
            <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2">
              <div className="glass-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm sm:text-base">Pending Approvals</h3>
                  <Link to="/vp-admin-x7k9/products"><Button variant="ghost" size="sm">View All</Button></Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.pendingProducts || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Products pending review</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm sm:text-base">Pending Payouts</h3>
                  <Link to="/vp-admin-x7k9/payouts"><Button variant="ghost" size="sm">View All</Button></Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.pendingPayouts || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Withdrawal requests</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}