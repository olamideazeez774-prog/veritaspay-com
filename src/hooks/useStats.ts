import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VendorStats, AffiliateStats, AdminStats } from "@/types/database";

export function useVendorStats(vendorId?: string) {
  return useQuery({
    queryKey: ["vendor-stats", vendorId],
    queryFn: async (): Promise<VendorStats> => {
      if (!vendorId) throw new Error("No vendor ID");

      // Get products
      const { data: products } = await supabase
        .from("products")
        .select("id, status")
        .eq("vendor_id", vendorId);

      // Get sales
      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount, vendor_earnings, status")
        .eq("vendor_id", vendorId);

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", vendorId)
        .single();

      const completedSales = sales?.filter((s) => s.status === "completed") || [];

      return {
        totalProducts: products?.length || 0,
        activeProducts: products?.filter((p) => p.status === "active").length || 0,
        totalSales: completedSales.length,
        totalRevenue: completedSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        pendingEarnings: wallet?.pending_balance || 0,
        clearedEarnings: wallet?.cleared_balance || 0,
        withdrawableBalance: wallet?.withdrawable_balance || 0,
      };
    },
    enabled: !!vendorId,
  });
}

export function useAffiliateStats(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-stats", affiliateId],
    queryFn: async (): Promise<AffiliateStats> => {
      if (!affiliateId) throw new Error("No affiliate ID");

      // Get links
      const { data: links } = await supabase
        .from("affiliate_links")
        .select("id, clicks_count, conversions_count")
        .eq("affiliate_id", affiliateId);

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", affiliateId)
        .single();

      const totalClicks = links?.reduce((sum, l) => sum + l.clicks_count, 0) || 0;
      const totalConversions = links?.reduce((sum, l) => sum + l.conversions_count, 0) || 0;

      return {
        totalLinks: links?.length || 0,
        totalClicks,
        totalConversions,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        pendingEarnings: wallet?.pending_balance || 0,
        clearedEarnings: wallet?.cleared_balance || 0,
        withdrawableBalance: wallet?.withdrawable_balance || 0,
      };
    },
    enabled: !!affiliateId,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      // Get profiles count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get roles
      const { data: roles } = await supabase.from("user_roles").select("role");

      // Get products
      const { data: products } = await supabase.from("products").select("id, is_approved");

      // Get sales
      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount, platform_fee, status");

      // Get pending payouts
      const { count: pendingPayouts } = await supabase
        .from("payout_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const completedSales = sales?.filter((s) => s.status === "completed") || [];

      return {
        totalUsers: totalUsers || 0,
        totalVendors: roles?.filter((r) => r.role === "vendor").length || 0,
        totalAffiliates: roles?.filter((r) => r.role === "affiliate").length || 0,
        totalProducts: products?.length || 0,
        pendingProducts: products?.filter((p) => !p.is_approved).length || 0,
        totalSales: completedSales.length,
        totalRevenue: completedSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        platformEarnings: completedSales.reduce((sum, s) => sum + Number(s.platform_fee), 0),
        pendingPayouts: pendingPayouts || 0,
      };
    },
  });
}
