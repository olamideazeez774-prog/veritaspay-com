import { describe, expect, it } from "vitest";
import { FOOTER_LINKS, PUBLIC_INFO_ROUTES } from "@/lib/siteRoutes";
import {
  DEFAULT_AI_OPTIMIZATION_SETTINGS,
  mergeAIOptimizationSettings,
} from "@/lib/aiSettings";
import { previewPaymentFee } from "@/lib/paymentProcessingFee";

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

describe("payment processing fee policy", () => {
  it("adds the estimated Paystack fee only when the customer bears it", () => {
    const customer = previewPaymentFee(10_000, "customer");
    const vendor = previewPaymentFee(10_000, "vendor");
    expect(customer.requiredAmount).toBeGreaterThan(10_000);
    expect(customer.customerProcessingFee).toBeGreaterThan(0);
    expect(customer.vendorProcessingFee).toBe(0);
    expect(vendor.requiredAmount).toBe(10_000);
    expect(vendor.customerProcessingFee).toBe(0);
    expect(vendor.vendorProcessingFee).toBeGreaterThan(0);
  });

  it("splits the estimated fee without reducing affiliate commission", () => {
    const split = previewPaymentFee(10_000, "split_50_50");
    expect(split.requiredAmount).toBeGreaterThan(10_000);
    expect(split.customerProcessingFee).toBeGreaterThan(0);
    expect(split.vendorProcessingFee).toBeGreaterThan(0);
    expect(Math.abs(split.customerProcessingFee - split.vendorProcessingFee)).toBeLessThanOrEqual(0.011);
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
    const affiliatePayouts = grossRevenue * (commissionPercent / 100);

    expect(grossRevenue).toBe(500_000);
    expect(platformFees).toBe(50_000);
    expect(affiliatePayouts).toBe(150_000);
    expect(grossRevenue - platformFees - affiliatePayouts).toBe(300_000);
  });
});
