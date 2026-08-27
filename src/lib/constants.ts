// Canonical MIRVYN pricing constants. Keep financial rules centralized and
// mirror them in server-side migrations/functions before deployment.
export const PLATFORM_NAME = "Mirvyn";
export const PLATFORM_TAGLINE = "The Modern Digital Commerce Platform";

export const DEFAULT_PLATFORM_FEE_PERCENT = 5;
export const DEFAULT_COMMISSION_PERCENT = 50;
export const MIN_COMMISSION_PERCENT = 35;
export const MAX_COMMISSION_PERCENT = 90;
export const DEFAULT_REFUND_WINDOW_DAYS = 0;
export const DEFAULT_COOKIE_DURATION_DAYS = 30;

export const MIN_WITHDRAWAL_AMOUNT = 3500;
export const PAYOUT_HOLD_HOURS = 12;

// Vendor registration is free. These legacy exports remain zero for callers
// that still import them; no paid onboarding path is valid.
export const VENDOR_REGISTRATION_FEE = 0;
export const VENDOR_STARTER_UPFRONT = 0;
export const VENDOR_STARTER_DEFERRED = 0;
export const VENDOR_STARTER_DEDUCT_FROM_SALES = 0;

export const AFFILIATE_REGISTRATION_FEE = 350;
export const AFFILIATE_DISPLAY_MONTHLY = 350;
export const AFFILIATE_RENEWAL_MONTHS = 1;

export const PRODUCT_LISTING_FEE_STANDARD = 2000;

export const WITHDRAWAL_FEE_TIERS = [
  { min: 3500, max: 9999, fee: 50 },
  { min: 10000, max: 20000, fee: 100 },
  { min: 20001, max: 50000, fee: 150 },
  { min: 50001, max: 100000, fee: 200 },
  { min: 100001, max: 500000, fee: 300 },
  { min: 500001, max: 1000000, fee: 400 },
  { min: 1000001, max: Number.POSITIVE_INFINITY, fee: 500 },
] as const;

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
  pending_review: "Pending Review",
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
  dashboard: "/dashboard",
  vendorProducts: "/dashboard/products",
  vendorProductNew: "/dashboard/products/new",
  vendorProductEdit: "/dashboard/products/:id/edit",
  vendorSales: "/dashboard/sales",
  affiliateLinks: "/dashboard/links",
  affiliateStats: "/dashboard/stats",
  wallet: "/dashboard/wallet",
  payouts: "/dashboard/payouts",
  settings: "/dashboard/settings",
  adminUsers: "/admin/users",
  adminProducts: "/admin/products",
  adminSales: "/admin/sales",
  adminPayouts: "/admin/payouts",
  adminSettings: "/admin/settings",
} as const;
