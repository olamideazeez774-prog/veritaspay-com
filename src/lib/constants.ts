// Platform configuration constants

export const PLATFORM_NAME = "Mirvyn";
export const PLATFORM_TAGLINE = "The Premium Affiliate Commerce Platform";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10; // Platform takes 10% on every vendor sale
export const DEFAULT_COMMISSION_PERCENT = 50; // Default affiliate commission (cannot be lower)
export const MIN_COMMISSION_PERCENT = 35; // Minimum affiliate commission (vendors can set higher)
export const MAX_COMMISSION_PERCENT = 90; // Maximum affiliate commission
export const DEFAULT_REFUND_WINDOW_DAYS = 0; // Strict no-refund policy (0 days)
export const DEFAULT_COOKIE_DURATION_DAYS = 30;
export const MIN_WITHDRAWAL_AMOUNT = 4000; // Minimum withdrawal: ₦4,000
export const WITHDRAWAL_FEE_PERCENT_MIN = 2; // Minimum withdrawal fee: 2%
export const WITHDRAWAL_FEE_PERCENT_MAX = 4; // Maximum withdrawal fee: 4%
export const REFERRAL_BONUS_PERCENT = 3; // 3% referral bonus on referred user earnings
export const VENDOR_REGISTRATION_FEE = 8500; // Vendor account creation: ₦8,500
export const AFFILIATE_REGISTRATION_FEE = 2000; // Affiliate registration: ₦2,000
export const AFFILIATE_RENEWAL_MONTHS = 6; // Affiliate renewal required every 6 months

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
