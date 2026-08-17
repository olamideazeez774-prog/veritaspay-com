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

export const DEFAULT_AI_OPTIMIZATION_SETTINGS: AIOptimizationSettings = {
  auto_generate_captions: false,
  auto_schedule_posts: false,
  content_frequency: "weekly",
  preferred_platforms: ["instagram", "twitter"],
  smart_alerts_enabled: true,
  alert_min_severity: "medium",
  auto_optimize_commissions: false,
  auto_adjust_prices: false,
  preferred_posting_times: ["09:00", "18:00"],
  timezone: "Africa/Lagos",
};

export function mergeAIOptimizationSettings(
  settings?: Partial<AIOptimizationSettings> | null,
): AIOptimizationSettings {
  return {
    ...DEFAULT_AI_OPTIMIZATION_SETTINGS,
    ...settings,
    preferred_platforms: settings?.preferred_platforms ?? DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_platforms,
    preferred_posting_times: settings?.preferred_posting_times ?? DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_posting_times,
  };
}
