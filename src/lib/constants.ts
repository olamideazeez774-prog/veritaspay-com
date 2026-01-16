// Platform configuration constants

export const PLATFORM_NAME = "Afficore";
export const PLATFORM_TAGLINE = "The Modern Affiliate Marketplace";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export const DEFAULT_COMMISSION_PERCENT = 30;
export const MIN_COMMISSION_PERCENT = 5;
export const MAX_COMMISSION_PERCENT = 90;
export const DEFAULT_REFUND_WINDOW_DAYS = 7;
export const DEFAULT_COOKIE_DURATION_DAYS = 30;
export const MIN_WITHDRAWAL_AMOUNT = 5000; // in Naira

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
