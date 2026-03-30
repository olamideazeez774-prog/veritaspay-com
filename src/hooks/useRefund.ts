import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessRefundInput {
  saleId: string;
  reason?: string;
}

export function useProcessRefund() {
  return useMutation({
    mutationFn: async ({ saleId, reason }: ProcessRefundInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("You must be logged in to process refunds");
      }

      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: {
          saleId,
          reason,
          requestedBy: userData.user.id,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Refund processed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to process refund");
    },
  });
}
