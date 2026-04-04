import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FraudEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  related_id: string | null;
  related_type: string | null;
  description: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  metadata: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  commission_held: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export function useFraudEvents(statusFilter?: string) {
  return useQuery({
    queryKey: ["fraud-events", statusFilter],
    queryFn: async () => {
      let query = supabase.from("fraud_events").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as FraudEvent[];
    },
  });
}

export function useUpdateFraudEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FraudEvent> & { id: string }) => {
      const { error } = await supabase.from("fraud_events").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fraud-events"] }); toast.success("Fraud event updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFraudStats() {
  return useQuery({
    queryKey: ["fraud-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fraud_events").select("status, severity");
      if (error) throw error;
      const events = data || [];
      return {
        total: events.length,
        flagged: events.filter(e => e.status === "flagged").length,
        confirmed: events.filter(e => e.status === "confirmed").length,
        dismissed: events.filter(e => e.status === "dismissed").length,
        critical: events.filter(e => e.severity === "critical").length,
        high: events.filter(e => e.severity === "high").length,
      };
    },
  });
}
