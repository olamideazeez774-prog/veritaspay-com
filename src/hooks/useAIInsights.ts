import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InsightType = "fraud_scoring" | "affiliate_coaching" | "product_matching" | "commission_optimization" | "churn_prediction" | "promo_timing" | "complaint_sentiment" | "smart_matching" | "platform_advisory";

export function useAIInsight() {
  return useMutation({
    mutationFn: async ({ type, data }: { type: InsightType; data: any }) => {
      const { data: result, error } = await supabase.functions.invoke("ai-insights", {
        body: { type, data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result.result as string;
    },
    onError: (e: Error) => {
      if (e.message.includes("Rate limited") || e.message.includes("429")) {
        toast.error("AI rate limited. Please try again in a moment.");
      } else if (e.message.includes("credits") || e.message.includes("402")) {
        toast.error("AI credits exhausted. Please add credits.");
      } else {
        toast.error("AI analysis failed: " + e.message);
      }
    },
  });
}
