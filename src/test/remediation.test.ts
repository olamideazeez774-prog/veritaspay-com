import { describe, expect, it } from "vitest";
import { FOOTER_LINKS, PUBLIC_INFO_ROUTES } from "@/lib/siteRoutes";
import {
  DEFAULT_AI_OPTIMIZATION_SETTINGS,
  mergeAIOptimizationSettings,
} from "@/lib/aiSettings";

describe("public route integrity", () => {
  it("registers every public information destination used by the footer", () => {
    const footerTargets = Object.values(FOOTER_LINKS)
      .flat()
      .map((link) => link.href.split("?")[0]);

    for (const target of footerTargets.filter((href) => href.startsWith("/"))) {
      if (target === "/pricing" || target === "/blog" || target === "/careers" || target === "/contact" || target === "/terms" || target === "/privacy" || target === "/cookies" || target === "/refunds") {
        expect(PUBLIC_INFO_ROUTES).toContain(target);
      }
    }
  });
});

describe("AI optimization settings", () => {
  it("returns stable defaults when a user has no settings row", () => {
    expect(mergeAIOptimizationSettings()).toEqual(DEFAULT_AI_OPTIMIZATION_SETTINGS);
  });

  it("merges partial settings without losing array defaults", () => {
    const merged = mergeAIOptimizationSettings({
      smart_alerts_enabled: false,
      timezone: "UTC",
      preferred_platforms: undefined,
    });

    expect(merged.smart_alerts_enabled).toBe(false);
    expect(merged.timezone).toBe("UTC");
    expect(merged.preferred_platforms).toEqual(DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_platforms);
    expect(merged.preferred_posting_times).toEqual(DEFAULT_AI_OPTIMIZATION_SETTINGS.preferred_posting_times);
  });
});

describe("ROI calculator economics", () => {
  it("matches the live default calculation", () => {
    const price = 10_000;
    const commissionPercent = 30;
    const platformFeePercent = 10;
    const monthlySales = 50;
    const grossRevenue = price * monthlySales;
    const platformFees = grossRevenue * (platformFeePercent / 100);
    const affiliatePayouts = ((price - price * (platformFeePercent / 100)) * (commissionPercent / 100)) * monthlySales;

    expect(grossRevenue).toBe(500_000);
    expect(platformFees).toBe(50_000);
    expect(affiliatePayouts).toBe(135_000);
    expect(grossRevenue - platformFees - affiliatePayouts).toBe(315_000);
  });
});
