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
  const defaults = DEFAULT_AI_OPTIMIZATION_SETTINGS;
  if (!settings) return { ...defaults };

  const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

  return {
    auto_generate_captions: bool(settings.auto_generate_captions, defaults.auto_generate_captions),
    auto_schedule_posts: bool(settings.auto_schedule_posts, defaults.auto_schedule_posts),
    content_frequency: pickOption(settings.content_frequency, ["daily", "weekly", "monthly"] as const, defaults.content_frequency),
    preferred_platforms: pickStringList(settings.preferred_platforms, defaults.preferred_platforms),
    smart_alerts_enabled: bool(settings.smart_alerts_enabled, defaults.smart_alerts_enabled),
    alert_min_severity: pickOption(settings.alert_min_severity, ["low", "medium", "high"] as const, defaults.alert_min_severity),
    auto_optimize_commissions: bool(settings.auto_optimize_commissions, defaults.auto_optimize_commissions),
    auto_adjust_prices: bool(settings.auto_adjust_prices, defaults.auto_adjust_prices),
    preferred_posting_times: pickStringList(settings.preferred_posting_times, defaults.preferred_posting_times),
    timezone: typeof settings.timezone === "string" && settings.timezone ? settings.timezone : defaults.timezone,
  };
}
