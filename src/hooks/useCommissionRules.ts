import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissionRule {
  id: string;
  name: string;
  rule_type: string;
  product_id: string | null;
  affiliate_id: string | null;
  min_sales: number;
  commission_override: number | null;
  bonus_amount: number;
  boost_percent: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useCommissionRules() {
  return useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as CommissionRule[];
    },
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<CommissionRule>) => {
      const { data, error } = await supabase.from("commission_rules").insert(rule as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-rules"] }); toast.success("Rule created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommissionRule> & { id: string }) => {
      const { error } = await supabase.from("commission_rules").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-rules"] }); toast.success("Rule updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-rules"] }); toast.success("Rule deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
