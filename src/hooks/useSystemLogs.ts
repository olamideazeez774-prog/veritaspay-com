import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

export interface SystemLog {
  id: string;
  event_type: string;
  category: string;
  actor_id: string | null;
  actor_email: string | null;
  related_id: string | null;
  related_type: string | null;
  amount: number | null;
  status: string | null;
  description: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogFilters {
  dateFrom: Date;
  dateTo: Date;
  category?: string;
  eventType?: string;
  search?: string;
}

export interface DailySummary {
  totalEvents: number;
  totalSales: number;
  totalRevenue: number;
  totalCommissions: number;
  totalPayouts: number;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  user_registered: "User Registration",
  vendor_registered: "Vendor Registration",
  affiliate_registered: "Affiliate Registration",
  admin_assigned: "Admin Assigned",
  role_removed: "Role Removed",
  product_submitted: "Product Submitted",
  product_approved: "Product Approved",
  product_rejected: "Product Rejected",
  product_status_changed: "Product Status Changed",
  sale_completed: "Sale Completed",
  refund_issued: "Refund Issued",
  payment_received: "Payment Received",
  payment_verified: "Payment Verified",
  payment_failed: "Payment Failed",
  withdrawal_requested: "Withdrawal Requested",
  payout_completed: "Payout Completed",
  payout_rejected: "Payout Rejected",
  payout_processing: "Payout Processing",
  commission_recorded: "Commission Recorded",
  vendor_earning_recorded: "Vendor Earning",
  platform_fee_recorded: "Platform Fee",
  withdrawal_processed: "Withdrawal Processed",
  commission_reversed: "Commission Reversed",
};

export const CATEGORY_LABELS: Record<string, string> = {
  user: "User",
  product: "Product",
  financial: "Financial",
  system: "System",
};

export function useSystemLogs(filters: LogFilters) {
  return useQuery({
    queryKey: ["system-logs", filters.dateFrom.toISOString(), filters.dateTo.toISOString(), filters.category, filters.eventType, filters.search],
    queryFn: async () => {
      let query = supabase
        .from("system_logs")
        .select("*")
        .gte("created_at", startOfDay(filters.dateFrom).toISOString())
        .lte("created_at", endOfDay(filters.dateTo).toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.eventType && filters.eventType !== "all") {
        query = query.eq("event_type", filters.eventType);
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,actor_email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SystemLog[];
    },
  });
}

export function useDailySummary(date: Date) {
  return useQuery({
    queryKey: ["daily-summary", date.toISOString()],
    queryFn: async (): Promise<DailySummary> => {
      const from = startOfDay(date).toISOString();
      const to = endOfDay(date).toISOString();

      const { data: logs } = await supabase
        .from("system_logs")
        .select("event_type, amount")
        .gte("created_at", from)
        .lte("created_at", to);

      const entries = logs || [];
      return {
        totalEvents: entries.length,
        totalSales: entries.filter(l => l.event_type === "sale_completed").length,
        totalRevenue: entries.filter(l => l.event_type === "sale_completed").reduce((s, l) => s + Number(l.amount || 0), 0),
        totalCommissions: entries.filter(l => l.event_type === "commission_recorded").reduce((s, l) => s + Number(l.amount || 0), 0),
        totalPayouts: entries.filter(l => l.event_type === "payout_completed").reduce((s, l) => s + Number(l.amount || 0), 0),
      };
    },
  });
}
