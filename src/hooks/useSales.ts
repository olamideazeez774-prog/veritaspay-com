import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/types/database";

interface SaleWithProduct extends Sale {
  products: { id: string; title: string; price: number; commission_percent: number; cover_image_url: string | null; external_url: string | null } | null;
}

export function useVendorSales(vendorId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["vendor-sales", vendorId, page, pageSize],
    queryFn: async () => {
      if (!vendorId) return [];
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data || []) as SaleWithProduct[];
    },
    enabled: !!vendorId,
  });
}

export function useAffiliateSales(affiliateId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["affiliate-sales", affiliateId, page, pageSize],
    queryFn: async () => {
      if (!affiliateId) return [];
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data || []) as SaleWithProduct[];
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
