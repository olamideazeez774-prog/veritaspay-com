import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Download, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency, formatDate } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/constants";
import { toast } from "sonner";
import { generatePremiumCertificatePDF } from "@/lib/certificateGenerator";
import { logger } from "@/lib/logger";

interface AffiliateRank {
  id: string;
  rank_name: string;
  min_earnings: number;
  fee_discount_percent: number;
  commission_boost_percent: number;
  badge_color: string;
  sort_order: number;
}

interface Certificate {
  id: string;
  rank_name: string;
  certificate_hash: string;
  issued_at: string;
  metadata: Record<string, unknown> | null;
}

const RANK_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🏅",
  Diamond: "💎",
  Platinum: "⬡",
  Elite: "👑",
};

export default function CertificatesPage() {
  const { user, profile, isAdmin } = useAuth();

  const { data: ranks } = useQuery({
    queryKey: ["affiliate-ranks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_ranks")
        .select("*")
        .order("min_earnings", { ascending: true });
      if (error) throw error;
      return data as AffiliateRank[];
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["my-wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("total_earned")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: certificates, refetch: refetchCerts } = useQuery({
    queryKey: ["my-certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: true });
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!user,
  });

  const { data: adminSignature } = useQuery({
    queryKey: ["admin-signature"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_signature")
        .maybeSingle();
      return (data?.value as Record<string, string>)?.url || null;
    },
  });

  const { data: ceoName } = useQuery({
    queryKey: ["ceo-name"],
    queryFn: async () => {
      // Get the first admin's name for signing
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);
      if (adminRoles?.[0]) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", adminRoles[0].user_id)
          .single();
        return adminProfile?.full_name || PLATFORM_NAME;
      }
      return PLATFORM_NAME;
    },
  });

  const totalEarned = isAdmin ? 999999999 : (wallet?.total_earned || 0);
  const currentRank = ranks?.filter((r) => totalEarned >= r.min_earnings).pop();
  const nextRank = isAdmin ? null : ranks?.find((r) => totalEarned < r.min_earnings);

  const handleClaimCertificate = async (rankName: string) => {
    if (!user) return;
    if (!adminSignature && !isAdmin) {
      toast.error("Certificates are not yet available. Admin signature is required.");
      return;
    }
    const hash = `VP-${rankName.toUpperCase()}-${user.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase();

    const metadata: Record<string, unknown> = {
      full_name: profile?.full_name,
      email: profile?.email,
      total_commission: totalEarned,
      milestone_date: new Date().toISOString(),
      platform_name: PLATFORM_NAME,
      avatar_url: profile?.avatar_url,
    };

    const { error } = await supabase.from("certificates").insert({
      user_id: user.id,
      rank_name: rankName,
      certificate_hash: hash,
      metadata: metadata,
    });

    if (error) {
      if (error.code === "23505") toast.info("Certificate already claimed!");
      else toast.error("Failed to claim certificate");
    } else {
      toast.success(`${rankName} certificate claimed!`);
      refetchCerts();
    }
  };

  const handleDownloadCert = async (cert: Certificate) => {
    try {
      const meta = cert.metadata as Record<string, unknown> | null;
      await generatePremiumCertificatePDF({
        rankName: cert.rank_name,
        fullName: (meta?.full_name as string) || profile?.full_name || "User",
        certificateHash: cert.certificate_hash,
        issuedAt: cert.issued_at,
        totalCommission: (meta?.total_commission as number) || 0,
        milestoneDate: (meta?.milestone_date as string) || cert.issued_at,
        avatarUrl: (meta?.avatar_url as string) || profile?.avatar_url,
        adminSignatureUrl: adminSignature,
        ceoName: ceoName || PLATFORM_NAME,
      });
      toast.success("Certificate downloaded!");
    } catch (err) {
      logger.error("PDF generation error", err);
      toast.error("Failed to generate PDF");
    }
  };

  const isLoading = !ranks;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
      </DashboardLayout>
    );
  }

  const claimedHashes = new Set(certificates?.map((c) => c.rank_name) || []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" />
            Rank Ladder & Certificates
          </h1>
          <p className="text-muted-foreground text-sm">Track your progress and claim achievement certificates</p>
        </div>

        {!adminSignature && !isAdmin && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span>Certificate claiming is disabled until the admin configures a signature. Contact your platform administrator.</span>
          </div>
        )}

        {/* Current Rank */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-16 w-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                style={{ backgroundColor: currentRank?.badge_color || "#666" }}>
                {RANK_ICONS[currentRank?.rank_name || ""] || "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{isAdmin ? "👑 Elite (Admin)" : (currentRank ? `${RANK_ICONS[currentRank.rank_name] || ""} ${currentRank.rank_name}` : "Unranked")}</h2>
                <p className="text-sm text-muted-foreground">Total earned: {isAdmin ? "∞" : formatCurrency(totalEarned)}</p>
                {nextRank && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(nextRank.min_earnings - totalEarned)} more to reach {nextRank.rank_name}
                  </p>
                )}
              </div>
              {currentRank && (
                <div className="flex flex-wrap gap-2">
                  <Badge>{currentRank.fee_discount_percent}% fee discount</Badge>
                  <Badge variant="secondary">+{currentRank.commission_boost_percent}% commission</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rank Ladder */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {ranks?.map((rank) => {
            const achieved = totalEarned >= rank.min_earnings;
            const claimed = claimedHashes.has(rank.rank_name);
            const progress = Math.min((totalEarned / rank.min_earnings) * 100, 100);
            const icon = RANK_ICONS[rank.rank_name] || "🏅";

            return (
              <motion.div key={rank.id} variants={staggerItem}>
                <Card className={achieved ? "border-primary/30" : "opacity-70"}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl shrink-0 bg-[var(--badge-color)]"
                      style={{ ["--badge-color" as string]: achieved ? rank.badge_color : "#444" }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{icon} {rank.rank_name}</p>
                        {achieved && <Shield className="h-4 w-4 text-success" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(rank.min_earnings)} earnings required
                      </p>
                      {!achieved && (
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all w-[var(--progress)]" style={{ ["--progress" as string]: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {achieved && !claimed && (
                        <Button size="sm" onClick={() => handleClaimCertificate(rank.rank_name)} disabled={!adminSignature && !isAdmin} className="min-h-[44px]">
                          <Award className="h-4 w-4 mr-1" />Claim
                        </Button>
                      )}
                      {achieved && claimed && (
                        <Badge variant="secondary">Claimed ✓</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Claimed Certificates */}
        {certificates && certificates.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Your Certificates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/50 border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{RANK_ICONS[cert.rank_name] || "🏅"}</span>
                      <p className="font-semibold">{cert.rank_name} Achievement</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{cert.certificate_hash}</p>
                    <p className="text-xs text-muted-foreground">Issued: {formatDate(cert.issued_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadCert(cert)} className="min-h-[44px]">
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/verify-certificate/${cert.certificate_hash}`);
                        toast.success("Verification link copied!");
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />Verify Link
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
