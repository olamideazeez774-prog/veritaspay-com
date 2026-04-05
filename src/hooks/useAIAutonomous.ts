import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIContentCalendarItem {
  id: string;
  content_type: "social_post" | "email" | "blog" | "ad";
  platform: string | null;
  title: string;
  content: string | null;
  affiliate_link_id: string | null;
  scheduled_at: string;
  status: "draft" | "scheduled" | "published" | "cancelled";
  ai_generated: boolean;
  performance_metrics?: {
    clicks?: number;
    conversions?: number;
    revenue?: number;
  };
}

export interface AISmartAlert {
  id: string;
  alert_type: "opportunity" | "trend" | "optimization" | "warning";
  severity: "info" | "low" | "medium" | "high";
  title: string;
  description: string;
  related_product_id: string | null;
  related_link_id: string | null;
  action_url: string | null;
  action_text: string | null;
  is_read: boolean;
  ai_analysis?: Record<string, unknown>;
  created_at: string;
}

export interface AIOptimizationSettings {
  auto_generate_captions: boolean;
  auto_schedule_posts: boolean;
  content_frequency: "daily" | "weekly" | "monthly";
  preferred_platforms: string[];
  smart_alerts_enabled: boolean;
  alert_min_severity: "low" | "medium" | "high";
  auto_optimize_commissions: boolean;
  auto_adjust_prices: boolean;
  preferred_posting_times: string[];
  timezone: string;
}

// Hook to fetch user's content calendar
export function useAIContentCalendar(status?: string) {
  return useQuery({
    queryKey: ["ai-content-calendar", status],
    queryFn: async () => {
      let query = supabase
        .from("ai_content_calendar")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AIContentCalendarItem[];
    },
  });
}

// Hook to fetch smart alerts
export function useAISmartAlerts(unreadOnly = false) {
  return useQuery({
    queryKey: ["ai-smart-alerts", unreadOnly],
    queryFn: async () => {
      let query = supabase
        .from("ai_smart_alerts")
        .select("*")
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AISmartAlert[];
    },
  });
}

// Hook to get unread alert count
export function useUnreadAlertCount() {
  return useQuery({
    queryKey: ["ai-unread-alert-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_alert_count");
      if (error) throw error;
      return data as number;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook to fetch AI settings
export function useAIOptimizationSettings() {
  return useQuery({
    queryKey: ["ai-optimization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_optimization_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as AIOptimizationSettings;
    },
  });
}

// Hook to update AI settings
export function useUpdateAIOptimizationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<AIOptimizationSettings>) => {
      const { data, error } = await supabase
        .from("ai_optimization_settings")
        .update(settings)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-optimization-settings"] });
      toast.success("AI settings updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });
}

// Hook to mark alert as read
export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc("mark_ai_alert_read", {
        alert_id: alertId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-smart-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["ai-unread-alert-count"] });
    },
  });
}

// Hook to dismiss alert
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc("dismiss_ai_alert", {
        alert_id: alertId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-smart-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["ai-unread-alert-count"] });
    },
  });
}

// Hook to create manual content item
export function useCreateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<AIContentCalendarItem, "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ai_content_calendar")
        .insert({ ...item, user_id: user.id } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-content-calendar"] });
      toast.success("Content scheduled");
    },
    onError: (error: Error) => {
      toast.error("Failed to schedule content: " + error.message);
    },
  });
}

// Hook to update content item status
export function useUpdateContentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("ai_content_calendar")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-content-calendar"] });
    },
  });
}

// Hook to delete content item
export function useDeleteContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_content_calendar")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-content-calendar"] });
      toast.success("Content removed");
    },
  });
}
