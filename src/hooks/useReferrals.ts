import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformReferral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  commission_paid: boolean;
  commission_amount: number;
  created_at: string;
}

// Get current user's referral code from profiles table
export function useUserReferralCode(userId?: string) {
  return useQuery({
    queryKey: ["user-referral-code", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data?.referral_code || null;
    },
    enabled: !!userId,
    retry: 3,
    retryDelay: 1000,
  });
}

// Legacy alias - keep for backward compat
export function useAffiliateReferralCode(affiliateId?: string) {
  const query = useUserReferralCode(affiliateId);
  // Transform to match old interface shape
  return {
    ...query,
    data: query.data ? { referral_code: query.data, affiliate_id: affiliateId } : undefined,
  };
}

// Get platform referrals for a user
export function usePlatformReferrals(userId?: string) {
  return useQuery({
    queryKey: ["platform-referrals", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("platform_referrals")
        .select("*")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlatformReferral[];
    },
    enabled: !!userId,
  });
}

// Validate referral code during registration - checks profiles table
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string }> {
  const upperCode = code.toUpperCase();
  
  // Check profiles table first (new system)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", upperCode)
    .maybeSingle();

  if (profile) {
    return { valid: true, referrerId: profile.id };
  }

  // Fallback to affiliate_referral_codes (legacy)
  const { data: legacy } = await supabase
    .from("affiliate_referral_codes")
    .select("affiliate_id")
    .eq("referral_code", upperCode)
    .maybeSingle();

  if (legacy) {
    return { valid: true, referrerId: legacy.affiliate_id };
  }

  return { valid: false };
}

// Record platform referral after registration
export async function recordPlatformReferral(
  referrerId: string,
  referredUserId: string,
  referralCode: string
): Promise<boolean> {
  // Block self-referrals
  if (referrerId === referredUserId) return false;

  const { error } = await supabase.from("platform_referrals").insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    referral_code: referralCode,
  });

  return !error;
}

// Get referred users with their profiles
export function useReferredUsers(userId?: string) {
  return useQuery({
    queryKey: ["referred-users", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");

      const { data: referrals, error } = await supabase
        .from("platform_referrals")
        .select("*")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = referrals.map((r) => r.referred_user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .in("id", userIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      return referrals.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.referred_user_id),
        roles: roles?.filter((role) => role.user_id === r.referred_user_id).map((role) => role.role) || [],
      }));
    },
    enabled: !!userId,
  });
}
