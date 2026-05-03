// Platform configuration constants

export const PLATFORM_NAME = "Mirvyn";
export const PLATFORM_TAGLINE = "The Premium Affiliate Commerce Platform";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10; // Platform takes 10% on every vendor sale
export const DEFAULT_COMMISSION_PERCENT = 50; // Default affiliate commission (cannot be lower)
export const MIN_COMMISSION_PERCENT = 35; // Minimum affiliate commission (vendors can set higher)
export const MAX_COMMISSION_PERCENT = 90; // Maximum affiliate commission
export const DEFAULT_REFUND_WINDOW_DAYS = 0; // Strict no-refund policy (0 days)
export const DEFAULT_COOKIE_DURATION_DAYS = 30;
export const MIN_WITHDRAWAL_AMOUNT = 2500; // Minimum withdrawal: ₦2,500
export const WITHDRAWAL_FEE_PERCENT_MIN = 2; // Large withdrawals (≥ ₦20,000): 2%
export const WITHDRAWAL_FEE_PERCENT_MAX = 3; // Small withdrawals (< ₦20,000): 3%
export const WITHDRAWAL_FEE_TIER_THRESHOLD = 20000; // ≥ this → 2%, else → 3%
export const PAYOUT_HOLD_HOURS = 12; // Auto-payouts held 12h for fraud review
export const REFERRAL_BONUS_PERCENT = 3; // 3% referral bonus on referred user earnings
export const VENDOR_REGISTRATION_FEE = 8500; // Standard plan: full ₦8,500 upfront
export const VENDOR_STARTER_UPFRONT = 3000; // Starter plan: ₦3,000 upfront
export const VENDOR_STARTER_DEFERRED = 5500; // Starter plan: ₦5,500 deducted from first 5 sales
export const VENDOR_STARTER_DEDUCT_FROM_SALES = 5; // Spread deferred amount across N first sales
export const AFFILIATE_REGISTRATION_FEE = 4000; // ₦4,000/year (displayed as ₦350/mo billed annually)
export const AFFILIATE_DISPLAY_MONTHLY = 350; // Marketing display price
export const AFFILIATE_RENEWAL_MONTHS = 12; // Annual renewal
export const PRODUCT_LISTING_FEE_STANDARD = 2000; // Standard product listing: ₦2,000 + 10%
export const PLATFORM_FEE_WAIVER_PERCENT = 15; // Waiver listing: ₦0 + 15%

export const CURRENCY = {
  code: "NGN",
  symbol: "₦",
  name: "Nigerian Naira",
};

export const ROLE_LABELS = {
  admin: "Administrator",
  vendor: "Vendor",
  affiliate: "Affiliate",
} as const;

export const PRODUCT_STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
} as const;

export const SALE_STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  refunded: "Refunded",
} as const;

export const PAYOUT_STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  rejected: "Rejected",
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  marketplace: "/marketplace",
  product: "/product/:id",
  checkout: "/checkout/:id",
  // Dashboard routes
  dashboard: "/dashboard",
  // Vendor routes
  vendorProducts: "/dashboard/products",
  vendorProductNew: "/dashboard/products/new",
  vendorProductEdit: "/dashboard/products/:id/edit",
  vendorSales: "/dashboard/sales",
  // Affiliate routes
  affiliateLinks: "/dashboard/links",
  affiliateStats: "/dashboard/stats",
  // Shared routes
  wallet: "/dashboard/wallet",
  payouts: "/dashboard/payouts",
  settings: "/dashboard/settings",
  // Admin routes
  adminUsers: "/admin/users",
  adminProducts: "/admin/products",
  adminSales: "/admin/sales",
  adminPayouts: "/admin/payouts",
  adminSettings: "/admin/settings",
} as const;
