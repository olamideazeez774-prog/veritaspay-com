import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromoMaterial {
  id: string;
  product_id: string | null;
  material_type: string;
  title: string;
  content: string;
  media_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePromoMaterials(productId?: string) {
  return useQuery({
    queryKey: ["promo-materials", productId],
    queryFn: async () => {
      let query = supabase.from("promo_materials").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (productId) query = query.eq("product_id", productId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PromoMaterial[];
    },
  });
}

export function useAllPromoMaterials() {
  return useQuery({
    queryKey: ["all-promo-materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_materials").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoMaterial[];
    },
  });
}

export function useCreatePromoMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (material: Partial<PromoMaterial>) => {
      const { data, error } = await supabase.from("promo_materials").insert(material as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["promo-materials"] }); qc.invalidateQueries({ queryKey: ["all-promo-materials"] }); toast.success("Material created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePromoMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["promo-materials"] }); qc.invalidateQueries({ queryKey: ["all-promo-materials"] }); toast.success("Material deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
