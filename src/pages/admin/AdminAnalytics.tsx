import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, ShoppingCart, Users, UserPlus, Wallet,
  ArrowUpRight, Calendar, BarChart3, RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminAnalytics, DATE_PRESETS, DateRange } from "@/hooks/useAdminAnalytics";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>(DATE_PRESETS[2].getRange()); // Last 7 days
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const { data, isLoading, refetch } = useAdminAnalytics(dateRange);

  const handlePreset = (index: number) => {
    setDateRange(DATE_PRESETS[index].getRange());
  };

  const handleCustomRange = () => {
    if (customFrom && customTo) {
      setDateRange({ from: customFrom, to: customTo, label: `${format(customFrom, "MMM dd")} - ${format(customTo, "MMM dd")}` });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground text-sm">{dateRange.label} · Real operational metrics</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset, i) => (
            <Button
              key={preset.label}
              variant={dateRange.label === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset(i)}
            >
              {preset.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="start" side="bottom">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">From</p>
                  <CalendarPicker mode="single" selected={customFrom} onSelect={setCustomFrom} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">To</p>
                  <CalendarPicker mode="single" selected={customTo} onSelect={setCustomTo} />
                </div>
              </div>
              <Button size="sm" onClick={handleCustomRange} disabled={!customFrom || !customTo} className="w-full">
                Apply Range
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : data ? (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
            {/* Period Stats */}
            <motion.div variants={staggerItem}>
              <h2 className="text-lg font-semibold mb-3">Period Metrics</h2>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard title="Sales" value={formatNumber(data.salesCount)} icon={ShoppingCart} variant="primary" />
                <StatCard title="Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} variant="success" />
                <StatCard title="Commissions" value={formatCurrency(data.affiliateCommissions)} icon={TrendingUp} variant="accent" />
                <StatCard title="Vendor Earnings" value={formatCurrency(data.vendorEarnings)} icon={Wallet} />
                <StatCard title="Platform Fees" value={formatCurrency(data.platformFees)} icon={DollarSign} variant="warning" />
                <StatCard title="Refunds" value={formatCurrency(data.refunds)} icon={RefreshCw} variant="warning" />
                <StatCard title="Payouts" value={formatCurrency(data.payoutsProcessed)} icon={Wallet} variant="primary" />
                <StatCard title="Transactions" value={formatNumber(data.transactionsCount)} icon={BarChart3} />
              </div>
            </motion.div>

            {/* Chart */}
            {data.dailySalesChart.length > 0 && (
              <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
                <h3 className="font-semibold mb-4">Sales Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailySalesChart}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="hsl(180, 55%, 40%)" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* All-Time + Users */}
            <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2">
              <div className="glass-card p-4 sm:p-6 space-y-3">
                <h3 className="font-semibold">All-Time Totals</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Total Sales", formatNumber(data.allTimeSales)],
                    ["Total Revenue", formatCurrency(data.allTimeRevenue)],
                    ["Total Commissions", formatCurrency(data.allTimeCommissions)],
                    ["Total Payouts", formatCurrency(data.allTimePayouts)],
                    ["Platform Earnings", formatCurrency(data.allTimePlatformFees)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 sm:p-6 space-y-3">
                <h3 className="font-semibold">User Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold">{data.activeUsers}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold">{data.newUsersToday}</p>
                    <p className="text-xs text-muted-foreground">New Today</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold">{data.newVendorsToday}</p>
                    <p className="text-xs text-muted-foreground">New Vendors</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold">{data.newAffiliatesToday}</p>
                    <p className="text-xs text-muted-foreground">New Affiliates</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
