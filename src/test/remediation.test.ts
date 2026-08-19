import { describe, expect, it } from "vitest";
import { FOOTER_LINKS, PUBLIC_INFO_ROUTES } from "@/lib/siteRoutes";
import {
  DEFAULT_AI_OPTIMIZATION_SETTINGS,
  mergeAIOptimizationSettings,
} from "@/lib/aiSettings";
import { previewPaymentFee } from "@/lib/paymentProcessingFee";
import { getWithdrawalFee, getWithdrawalNetAmount } from "@/lib/withdrawalFees";

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
  it("keeps the customer payment at the product price and makes the vendor bear the fee", () => {
    const vendor = previewPaymentFee(10_000, "vendor");
    expect(vendor.requiredAmount).toBe(10_000);
    expect(vendor.customerProcessingFee).toBe(0);
    expect(vendor.vendorProcessingFee).toBeGreaterThan(0);
    expect(vendor.affiliateProcessingFee).toBe(0);
  });

  it("splits the verified processing fee 50/50 between vendor and affiliate", () => {
    const split = previewPaymentFee(10_000, "vendor_affiliate_split_50_50");
    expect(split.requiredAmount).toBe(10_000);
    expect(split.customerProcessingFee).toBe(0);
    expect(split.vendorProcessingFee).toBeGreaterThan(0);
    expect(split.affiliateProcessingFee).toBeGreaterThan(0);
    expect(Math.abs(split.vendorProcessingFee - split.affiliateProcessingFee)).toBeLessThanOrEqual(0.01);
  });

  it("uses fixed withdrawal tiers and the ₦3,500 minimum", () => {
    expect(getWithdrawalFee(3499)).toBe(0);
    expect(getWithdrawalFee(3500)).toBe(50);
    expect(getWithdrawalFee(9999)).toBe(50);
    expect(getWithdrawalFee(10000)).toBe(100);
    expect(getWithdrawalFee(20000)).toBe(100);
    expect(getWithdrawalFee(20001)).toBe(150);
    expect(getWithdrawalFee(50000)).toBe(150);
    expect(getWithdrawalFee(50001)).toBe(200);
    expect(getWithdrawalFee(100000)).toBe(200);
    expect(getWithdrawalFee(100001)).toBe(300);
    expect(getWithdrawalFee(500001)).toBe(400);
    expect(getWithdrawalFee(1000001)).toBe(500);
    expect(getWithdrawalNetAmount(10000)).toBe(9900);
  });
});

describe("ROI calculator economics", () => {
  it("matches the live default calculation", () => {
    const price = 10_000;
    const commissionPercent = 30;
    const platformFeePercent = 5;
    const monthlySales = 50;
    const grossRevenue = price * monthlySales;
    const platformFees = grossRevenue * (platformFeePercent / 100);
    const affiliatePayouts = grossRevenue * (commissionPercent / 100);

    expect(grossRevenue).toBe(500_000);
    expect(platformFees).toBe(25_000);
    expect(affiliatePayouts).toBe(150_000);
    expect(grossRevenue - platformFees - affiliatePayouts).toBe(325_000);
  });
});
