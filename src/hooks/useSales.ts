import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/types/database";

export function useVendorSales(vendorId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["vendor-sales", vendorId, page, pageSize],
    queryFn: async () => {
      if (!vendorId) return { sales: [], total: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from("sales")
        .select("*, products(*)", { count: "exact" })
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { sales: data as (Sale & { products: Record<string, unknown> })[], total: count || 0 };
    },
    enabled: !!vendorId,
  });
}

export function useAffiliateSales(affiliateId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["affiliate-sales", affiliateId, page, pageSize],
    queryFn: async () => {
      if (!affiliateId) return { sales: [], total: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from("sales")
        .select("*, products(*)", { count: "exact" })
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { sales: data as (Sale & { products: Record<string, unknown> })[], total: count || 0 };
    },
    enabled: !!affiliateId,
  });
}

export function useAllSales() {
  return useQuery({
    queryKey: ["all-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (Sale & { products: Record<string, unknown> })[];
    },
  });
}
