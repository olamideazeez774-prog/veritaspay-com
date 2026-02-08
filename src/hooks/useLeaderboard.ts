import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

export interface LeaderboardEntry {
  affiliate_id: string;
  affiliate_name: string | null;
  affiliate_email: string;
  total_sales: number;
  total_commission: number;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
}

export function useLeaderboard(period: "today" | "week" | "month" | "all") {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      let dateFrom: Date | null = null;
      const now = new Date();
      switch (period) {
        case "today": dateFrom = startOfDay(now); break;
        case "week": dateFrom = startOfWeek(now); break;
        case "month": dateFrom = startOfMonth(now); break;
      }

      let salesQuery = supabase.from("sales").select("affiliate_id, affiliate_commission, total_amount, status").not("affiliate_id", "is", null).eq("status", "completed");
      if (dateFrom) salesQuery = salesQuery.gte("created_at", dateFrom.toISOString());
      const { data: sales } = await salesQuery;

      // Aggregate by affiliate
      const affiliateMap = new Map<string, { sales: number; commission: number }>();
      (sales || []).forEach(s => {
        if (!s.affiliate_id) return;
        const existing = affiliateMap.get(s.affiliate_id) || { sales: 0, commission: 0 };
        existing.sales += 1;
        existing.commission += Number(s.affiliate_commission);
        affiliateMap.set(s.affiliate_id, existing);
      });

      if (affiliateMap.size === 0) return [];

      // Get profiles and link stats
      const affiliateIds = [...affiliateMap.keys()];
      const [{ data: profiles }, { data: links }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", affiliateIds),
        supabase.from("affiliate_links").select("affiliate_id, clicks_count, conversions_count").in("affiliate_id", affiliateIds),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const linkStats = new Map<string, { clicks: number; conversions: number }>();
      (links || []).forEach(l => {
        const existing = linkStats.get(l.affiliate_id) || { clicks: 0, conversions: 0 };
        existing.clicks += l.clicks_count;
        existing.conversions += l.conversions_count;
        linkStats.set(l.affiliate_id, existing);
      });

      return affiliateIds.map(id => {
        const stats = affiliateMap.get(id)!;
        const profile = profileMap.get(id);
        const ls = linkStats.get(id) || { clicks: 0, conversions: 0 };
        return {
          affiliate_id: id,
          affiliate_name: profile?.full_name || null,
          affiliate_email: profile?.email || "",
          total_sales: stats.sales,
          total_commission: stats.commission,
          total_clicks: ls.clicks,
          total_conversions: ls.conversions,
          conversion_rate: ls.clicks > 0 ? (ls.conversions / ls.clicks) * 100 : 0,
        } as LeaderboardEntry;
      }).sort((a, b) => b.total_commission - a.total_commission);
    },
  });
}
