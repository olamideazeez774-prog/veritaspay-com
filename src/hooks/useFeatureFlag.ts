import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "feature_flags")
        .maybeSingle();
      return (data?.value as Record<string, { enabled: boolean }>) || {};
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    enabled: data?.[key]?.enabled ?? true,
    isLoading,
  };
}
