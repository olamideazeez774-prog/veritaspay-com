import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Transaction, PayoutRequest } from "@/types/database";
import { toast } from "sonner";

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

export function useTransactions(walletId?: string) {
  return useQuery({
    queryKey: ["transactions", walletId],
    queryFn: async () => {
      if (!walletId) return [];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
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
      const { data, error } = await supabase
        .from("payout_requests")
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          amount: request.amount,
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
      toast.success("Payout request submitted!");
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
