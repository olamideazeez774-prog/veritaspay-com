import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AffiliateCampaign {
  id: string;
  affiliate_id: string;
  link_id: string | null;
  campaign_name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  clicks: number;
  conversions: number;
  created_at: string;
}

export function useAffiliateCampaigns(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-campaigns", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("affiliate_campaigns")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AffiliateCampaign[];
    },
    enabled: !!affiliateId,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Partial<AffiliateCampaign>) => {
      const { data, error } = await supabase.from("affiliate_campaigns").insert(campaign as { affiliate_id: string; campaign_name: string; clicks?: number; conversions?: number; created_at?: string; id?: string; link_id?: string; utm_campaign?: string; utm_content?: string; utm_medium?: string; utm_source?: string }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["affiliate-campaigns"] }); toast.success("Campaign created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
