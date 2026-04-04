import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MousePointer, DollarSign, Target, ShoppingCart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency } from "@/lib/format";

export default function AffiliateAnalytics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30");

  const { data: links } = useQuery({
    queryKey: ["my-links-analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("id, product_id, unique_code, clicks_count, conversions_count, products(title, price)")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sales } = useQuery({
    queryKey: ["my-sales-analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, affiliate_commission, total_amount, status, created_at, product_id")
        .eq("affiliate_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalClicks = links?.reduce((s, l) => s + l.clicks_count, 0) || 0;
  const totalConversions = links?.reduce((s, l) => s + l.conversions_count, 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";
  const totalCommission = sales?.reduce((s, sale) => s + (sale.status !== "refunded" ? sale.affiliate_commission : 0), 0) || 0;
  const epc = totalClicks > 0 ? totalCommission / totalClicks : 0;
  const refundedSales = sales?.filter((s) => s.status === "refunded").length || 0;
  const refundRate = sales && sales.length > 0 ? ((refundedSales / sales.length) * 100).toFixed(1) : "0";

  // Product performance breakdown
  const productStats = links?.map((link) => {
    const product = link.products as Product | undefined;
    const productSales = sales?.filter((s) => s.product_id === link.product_id) || [];
    const productCommission = productSales.reduce((s, sale) => s + sale.affiliate_commission, 0);
    const productEpc = link.clicks_count > 0 ? productCommission / link.clicks_count : 0;
    const productConvRate = link.clicks_count > 0 ? (link.conversions_count / link.clicks_count) * 100 : 0;

    return {
      title: product?.title || "Unknown",
      clicks: link.clicks_count,
      conversions: link.conversions_count,
      commission: productCommission,
      epc: productEpc,
      conversionRate: productConvRate,
    };
  }).sort((a, b) => b.commission - a.commission) || [];

  const isLoading = !links;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Conversion Intelligence
            </h1>
            <p className="text-muted-foreground text-sm">Deep analytics on your affiliate performance</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          {/* KPI Stats */}
          <motion.div variants={staggerItem} className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Total Clicks" value={totalClicks.toString()} icon={MousePointer} />
            <StatCard title="Conversions" value={totalConversions.toString()} icon={ShoppingCart} />
            <StatCard title="Conv. Rate" value={`${conversionRate}%`} icon={Target} />
            <StatCard title="Total Commission" value={formatCurrency(totalCommission)} icon={DollarSign} />
            <StatCard title="EPC" value={formatCurrency(epc)} icon={TrendingUp} />
            <StatCard title="Refund Rate" value={`${refundRate}%`} icon={BarChart3} />
          </motion.div>

          {/* Product Performance Table */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader><CardTitle>Product Performance</CardTitle></CardHeader>
              <CardContent>
                {productStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No products linked yet</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="overflow-x-auto hidden sm:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">Product</th>
                            <th className="text-right py-3 px-2 font-medium">Clicks</th>
                            <th className="text-right py-3 px-2 font-medium">Conv.</th>
                            <th className="text-right py-3 px-2 font-medium">Rate</th>
                            <th className="text-right py-3 px-2 font-medium">EPC</th>
                            <th className="text-right py-3 px-2 font-medium">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStats.map((p, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-3 px-2 font-medium truncate max-w-[200px]">{p.title}</td>
                              <td className="py-3 px-2 text-right">{p.clicks}</td>
                              <td className="py-3 px-2 text-right">{p.conversions}</td>
                              <td className="py-3 px-2 text-right">{p.conversionRate.toFixed(1)}%</td>
                              <td className="py-3 px-2 text-right">{formatCurrency(p.epc)}</td>
                              <td className="py-3 px-2 text-right font-semibold">{formatCurrency(p.commission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {productStats.map((p, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-2">
                          <p className="font-medium text-sm truncate">{p.title}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Clicks:</span> {p.clicks}</div>
                            <div><span className="text-muted-foreground">Conv:</span> {p.conversions}</div>
                            <div><span className="text-muted-foreground">Rate:</span> {p.conversionRate.toFixed(1)}%</div>
                            <div><span className="text-muted-foreground">EPC:</span> {formatCurrency(p.epc)}</div>
                          </div>
                          <p className="text-sm font-semibold">{formatCurrency(p.commission)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
