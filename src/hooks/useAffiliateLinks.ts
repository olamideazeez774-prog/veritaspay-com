import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AffiliateLink } from "@/types/database";
import { toast } from "sonner";

export function useAffiliateLinks(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-links", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("*, products(*)")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (AffiliateLink & { products: any })[];
    },
    enabled: !!affiliateId,
  });
}

export function useCreateAffiliateLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ affiliateId, productId }: { affiliateId: string; productId: string }) => {
      // Generate unique code
      const { data: codeData } = await supabase.rpc("generate_affiliate_code");
      
      const { data, error } = await supabase
        .from("affiliate_links")
        .insert({
          affiliate_id: affiliateId,
          product_id: productId,
          unique_code: codeData || Math.random().toString(36).substring(2, 10).toUpperCase(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-links"] });
      toast.success("Affiliate link created!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAffiliateLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("affiliate_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-links"] });
      toast.success("Link deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
