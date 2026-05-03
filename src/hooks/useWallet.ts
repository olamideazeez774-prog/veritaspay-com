import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Transaction, PayoutRequest } from "@/types/database";
import { toast } from "sonner";
import { WITHDRAWAL_FEE_PERCENT_MIN, WITHDRAWAL_FEE_PERCENT_MAX, WITHDRAWAL_FEE_TIER_THRESHOLD } from "@/lib/constants";

export function useWallet(userId?: string) {
  return useQuery({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) throw error;
      return data as Wallet;
    },
    enabled: !!userId,
  });
}

export function useTransactions(walletId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["transactions", walletId, page, pageSize],
    queryFn: async () => {
      if (!walletId) return { transactions: [], total: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { transactions: data as Transaction[], total: count || 0 };
    },
    enabled: !!walletId,
  });
}

export function usePayoutRequests(userId?: string) {
  return useQuery({
    queryKey: ["payout-requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PayoutRequest[];
    },
    enabled: !!userId,
  });
}

export function useCreatePayoutRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: { user_id: string; wallet_id: string; amount: number; bank_name?: string; account_number?: string; account_name?: string }) => {
      const feePercent = request.amount >= WITHDRAWAL_FEE_TIER_THRESHOLD
        ? WITHDRAWAL_FEE_PERCENT_MIN
        : WITHDRAWAL_FEE_PERCENT_MAX;
      const feeAmount = Math.round(request.amount * feePercent / 100);
      const netAmount = Math.max(0, request.amount - feeAmount);
      const { data, error } = await supabase
        .from("payout_requests")
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          amount: request.amount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          bank_name: request.bank_name,
          account_number: request.account_number,
          account_name: request.account_name,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Payout requested! Held 12 hours for fraud review, then auto-paid via Paystack.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAllPayoutRequests() {
  return useQuery({
    queryKey: ["all-payout-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePayoutRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayoutRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("payout_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-payout-requests"] });
      toast.success("Payout request updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
