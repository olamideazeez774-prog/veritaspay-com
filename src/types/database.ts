// Extended types for the application

export type AppRole = "admin" | "vendor" | "affiliate";

export type ProductStatus = "draft" | "active" | "paused";

export type SaleStatus = "pending" | "completed" | "refunded";

export type PayoutStatus = "pending" | "processing" | "paid" | "rejected";

export type TransactionType = "sale_commission" | "sale_vendor" | "platform_fee" | "withdrawal" | "refund";

export type EarningState = "pending" | "cleared" | "withdrawable";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  referral_code: string | null;
  referred_by: string | null;
  is_verified: boolean;
  is_banned: boolean;
  suspended_until: string | null;
  admin_notes: string | null;
  vendor_tier: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  price: number;
  commission_percent: number;
  platform_fee_percent: number;
  refund_window_days: number;
  cookie_duration_days: number;
  status: ProductStatus;
  is_approved: boolean;
  affiliate_enabled: boolean;
  is_subscription: boolean;
  subscription_interval: string | null;
  file_url: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  is_sponsored: boolean | null;
  ranking_score: number | null;
  second_tier_commission_percent: number | null;
  created_at: string;
  updated_at: string;
  vendor?: Profile;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  product_id: string;
  unique_code: string;
  clicks_count: number;
  conversions_count: number;
  created_at: string;
  product?: Product;
  affiliate?: Profile;
}

export interface Click {
  id: string;
  link_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  vendor_id: string;
  affiliate_id: string | null;
  buyer_email: string;
  total_amount: number;
  platform_fee: number;
  affiliate_commission: number;
  vendor_earnings: number;
  commission_percent_snapshot: number;
  platform_fee_percent_snapshot: number;
  status: SaleStatus;
  refund_eligible_until: string | null;
  payment_reference: string | null;
  payment_gateway: string | null;
  second_tier_affiliate_id: string | null;
  second_tier_commission: number | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  vendor?: Profile;
  affiliate?: Profile;
}

export interface Wallet {
  id: string;
  user_id: string;
  pending_balance: number;
  cleared_balance: number;
  withdrawable_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  sale_id: string | null;
  amount: number;
  type: TransactionType;
  earning_state: EarningState | null;
  description: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  status: PayoutStatus;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  totalRevenue: number;
  pendingEarnings: number;
  clearedEarnings: number;
  withdrawableBalance: number;
}

export interface AffiliateStats {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  pendingEarnings: number;
  clearedEarnings: number;
  withdrawableBalance: number;
}

export interface AdminStats {
  totalUsers: number;
  totalVendors: number;
  totalAffiliates: number;
  totalProducts: number;
  pendingProducts: number;
  totalSales: number;
  totalRevenue: number;
  platformEarnings: number;
  pendingPayouts: number;
}
