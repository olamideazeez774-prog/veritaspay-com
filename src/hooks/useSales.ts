import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/types/database";

export function useVendorSales(vendorId?: string) {
  return useQuery({
    queryKey: ["vendor-sales", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (Sale & { products: any })[];
    },
    enabled: !!vendorId,
  });
}

export function useAffiliateSales(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-sales", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (Sale & { products: any })[];
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
      return data as (Sale & { products: any })[];
    },
  });
}
