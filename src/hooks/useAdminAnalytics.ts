import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export const DATE_PRESETS: { label: string; getRange: () => DateRange }[] = [
  { label: "Today", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()), label: "Today" }) },
  { label: "Yesterday", getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)), label: "Yesterday" }) },
  { label: "Last 7 days", getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()), label: "Last 7 days" }) },
  { label: "Last 30 days", getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()), label: "Last 30 days" }) },
];

export interface AnalyticsData {
  // Period metrics
  salesCount: number;
  transactionsCount: number;
  revenue: number;
  affiliateCommissions: number;
  vendorEarnings: number;
  refunds: number;
  payoutsProcessed: number;
  platformFees: number;
  // All-time metrics
  allTimeSales: number;
  allTimeRevenue: number;
  allTimeCommissions: number;
  allTimePayouts: number;
  allTimePlatformFees: number;
  // User metrics
  activeUsers: number;
  newUsersToday: number;
  newVendorsToday: number;
  newAffiliatesToday: number;
  // Chart data
  dailySalesChart: { date: string; sales: number; revenue: number }[];
}

export function useAdminAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ["admin-analytics", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // Fetch all data in parallel
      const [
        periodSales,
        allSales,
        periodPayouts,
        allPayouts,
        allProfiles,
        todayProfiles,
        todayRoles,
        allRoles,
      ] = await Promise.all([
        // Period sales
        supabase.from("sales").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        // All-time sales
        supabase.from("sales").select("total_amount, platform_fee, affiliate_commission, vendor_earnings, status"),
        // Period payouts
        supabase.from("payout_requests").select("amount, status").gte("created_at", fromISO).lte("created_at", toISO).eq("status", "paid"),
        // All-time payouts
        supabase.from("payout_requests").select("amount, status").eq("status", "paid"),
        // All profiles count
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        // Today's new profiles
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
        // Today's new roles
        supabase.from("user_roles").select("role").gte("created_at", todayStart).lte("created_at", todayEnd),
        // All roles for active counts
        supabase.from("user_roles").select("role, user_id"),
      ]);

      const pSales = periodSales.data || [];
      const completedPeriod = pSales.filter(s => s.status === "completed");
      const refundedPeriod = pSales.filter(s => s.status === "refunded");

      const aS = allSales.data || [];
      const completedAll = aS.filter(s => s.status === "completed");

      // Build daily chart data
      const dailyMap = new Map<string, { sales: number; revenue: number }>();
      completedPeriod.forEach(s => {
        const day = format(new Date(s.created_at), "MMM dd");
        const existing = dailyMap.get(day) || { sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += Number(s.total_amount);
        dailyMap.set(day, existing);
      });

      const dailySalesChart = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      return {
        salesCount: completedPeriod.length,
        transactionsCount: pSales.length,
        revenue: completedPeriod.reduce((s, x) => s + Number(x.total_amount), 0),
        affiliateCommissions: completedPeriod.reduce((s, x) => s + Number(x.affiliate_commission), 0),
        vendorEarnings: completedPeriod.reduce((s, x) => s + Number(x.vendor_earnings), 0),
        refunds: refundedPeriod.reduce((s, x) => s + Number(x.total_amount), 0),
        payoutsProcessed: (periodPayouts.data || []).reduce((s, x) => s + Number(x.amount), 0),
        platformFees: completedPeriod.reduce((s, x) => s + Number(x.platform_fee), 0),

        allTimeSales: completedAll.length,
        allTimeRevenue: completedAll.reduce((s, x) => s + Number(x.total_amount), 0),
        allTimeCommissions: completedAll.reduce((s, x) => s + Number(x.affiliate_commission), 0),
        allTimePayouts: (allPayouts.data || []).reduce((s, x) => s + Number(x.amount), 0),
        allTimePlatformFees: completedAll.reduce((s, x) => s + Number(x.platform_fee), 0),

        activeUsers: allProfiles.count || 0,
        newUsersToday: todayProfiles.count || 0,
        newVendorsToday: (todayRoles.data || []).filter(r => r.role === "vendor").length,
        newAffiliatesToday: (todayRoles.data || []).filter(r => r.role === "affiliate").length,

        dailySalesChart,
      };
    },
  });
}
