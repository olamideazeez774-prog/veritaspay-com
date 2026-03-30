import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ListingPayment {
  id: string;
  vendor_id: string;
  product_id: string | null;
  amount: number;
  payment_reference: string;
  payment_gateway: string;
  business_name: string | null;
  business_email: string | null;
  status: "pending" | "verified" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fixed listing fee in Naira
export const LISTING_FEE = 2000;

export function useListingPayments(vendorId?: string) {
  return useQuery({
    queryKey: ["listing-payments", vendorId],
    queryFn: async () => {
      let query = supabase
        .from("product_listing_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (vendorId) {
        query = query.eq("vendor_id", vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ListingPayment[];
    },
    enabled: !!vendorId,
  });
}

export function useAllListingPayments() {
  return useQuery({
    queryKey: ["all-listing-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_listing_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ListingPayment[];
    },
  });
}

export function useCreateListingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      vendor_id: string;
      product_id?: string;
      amount: number;
      payment_reference: string;
      business_name?: string;
      business_email?: string;
    }) => {
      const { data, error } = await supabase
        .from("product_listing_payments")
        .insert({
          vendor_id: payment.vendor_id,
          product_id: payment.product_id || null,
          amount: payment.amount,
          payment_reference: payment.payment_reference,
          business_name: payment.business_name || null,
          business_email: payment.business_email || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-payments"] });
      toast.success("Payment recorded! Awaiting admin verification.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateListingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: "verified" | "rejected";
      admin_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("product_listing_payments")
        .update({ status, admin_notes })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-listing-payments"] });
      queryClient.invalidateQueries({ queryKey: ["listing-payments"] });
      toast.success("Payment status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
