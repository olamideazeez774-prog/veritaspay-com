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

type LooseAIOptimizationSettings = Partial<Record<keyof AIOptimizationSettings, unknown>>;

function pickOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickStringList(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

export function mergeAIOptimizationSettings(
  settings?: LooseAIOptimizationSettings | null,
): AIOptimizationSettings {
  return {
    ...DEFAULT_AI_OPTIMIZATION_SETTINGS,
    ...settings,
    preferred_platforms: settings?.preferred_platforms ?? DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_platforms,
    preferred_posting_times: settings?.preferred_posting_times ?? DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_posting_times,
  };
}
