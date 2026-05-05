import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FEATURE_FLAG_DEFAULTS: Record<string, { enabled: boolean }> = {
  listing_fees: { enabled: true },
  platform_fees: { enabled: true },
  withdrawal_fees: { enabled: true },
  promo_campaigns: { enabled: true },
  ai_modules: { enabled: true },
  commission_boosts: { enabled: true },
  vendor_onboarding: { enabled: true },
  affiliate_rewards: { enabled: true },
  ranking_algorithm: { enabled: true },
  experiments: { enabled: false },
  affiliate_toolkit: { enabled: true },
  certificates: { enabled: true },
  daily_digest: { enabled: true },
  leaderboard: { enabled: true },
};

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "feature_flags")
        .maybeSingle();
      return { ...FEATURE_FLAG_DEFAULTS, ...((data?.value as Record<string, { enabled: boolean }>) || {}) };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    enabled: data?.[key]?.enabled ?? FEATURE_FLAG_DEFAULTS[key]?.enabled ?? true,
    isLoading,
  };
}

export function useAllFeatureFlags(): { flags: Record<string, { enabled: boolean }>; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "feature_flags")
        .maybeSingle();
      return { ...FEATURE_FLAG_DEFAULTS, ...((data?.value as Record<string, { enabled: boolean }>) || {}) };
    },
    staleTime: 1000 * 60 * 5,
  });

  return { flags: data || {}, isLoading };
}
