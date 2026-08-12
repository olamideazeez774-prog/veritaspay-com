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
import { generatePremiumCertificatePDF, generateEarningCertificatePDF } from "@/lib/certificateGenerator";
import { logger } from "@/lib/logger";

interface AffiliateRank {
  id: string;
  rank_name: string;
  min_earnings: number;
  fee_discount_percent: number;
  commission_boost_percent: number;
  badge_color: string;
  sort_order: number;
  description: string | null;
}

interface Certificate {
  id: string;
  rank_name: string;
  certificate_hash: string;
  issued_at: string;
  metadata: Record<string, unknown> | null;
  cert_type: string;
  threshold_amount: number | null;
}

const RANK_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🏅",
  Platinum: "⬡",
  Diamond: "💎",
  Sapphire: "🔷",
  Elite: "👑",
  Icon: "⭐",
};

const EARNING_MILESTONES = [100000, 250000, 500000, 1000000];

type Milestone =
  | { kind: "rank"; threshold: number; rank: AffiliateRank }
  | { kind: "earning"; threshold: number };

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
    enabled: !!user && !!isAdmin,
  });

  // Public flag: non-admins use this to know whether the platform signature is configured
  const { data: signatureConfigured } = useQuery({
    queryKey: ["admin-signature-configured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_signature_configured")
        .maybeSingle();
      return Boolean((data?.value as Record<string, boolean>)?.configured);
    },
  });

  const canClaim = isAdmin || signatureConfigured;

  const totalEarned = isAdmin ? 999999999 : (wallet?.total_earned || 0);
  const currentRank = ranks?.filter((r) => totalEarned >= r.min_earnings).pop();
  const nextRank = isAdmin ? null : ranks?.find((r) => totalEarned < r.min_earnings);

  const handleClaimCertificate = async (rank: AffiliateRank) => {
    if (!user) return;
    if (!isAdmin && !signatureConfigured) {
      toast.error("Certificates are not yet available. Admin signature is required.");
      return;
    }
    const hash = `VP-${rank.rank_name.toUpperCase()}-${user.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase();

    const metadata = {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      total_commission: totalEarned,
      milestone_date: new Date().toISOString(),
      platform_name: PLATFORM_NAME,
      avatar_url: profile?.avatar_url || "",
      rank_description: rank.description || "",
    };

    const { error } = await supabase.from("certificates").insert([{
      user_id: user.id,
      rank_name: rank.rank_name,
      cert_type: "rank",
      threshold_amount: rank.min_earnings,
      certificate_hash: hash,
      metadata: metadata,
    }]);

    if (error) {
      if (error.code === "23505") toast.info("Certificate already claimed!");
      else toast.error("Failed to claim certificate");
    } else {
      toast.success(`${rank.rank_name} certificate claimed!`);
      refetchCerts();
    }
  };

  const handleClaimEarningCertificate = async (amount: number) => {
    if (!user) return;
    if (!isAdmin && !signatureConfigured) {
      toast.error("Certificates are not yet available. Admin signature is required.");
      return;
    }
    const hash = `VP-EARN-${user.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase();

    const { error } = await supabase.from("certificates").insert([{
      user_id: user.id,
      rank_name: `Earning ${formatCurrency(amount)}`,
      cert_type: "earning",
      threshold_amount: amount,
      certificate_hash: hash,
      metadata: {
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        total_commission: amount,
        milestone_date: new Date().toISOString(),
        platform_name: PLATFORM_NAME,
        avatar_url: profile?.avatar_url || "",
      },
    }]);

    if (error) {
      if (error.code === "23505") toast.info("Certificate already claimed!");
      else toast.error("Failed to claim certificate");
    } else {
      toast.success(`${formatCurrency(amount)} earning certificate claimed!`);
      refetchCerts();
    }
  };

  const handleDownloadCert = async (cert: Certificate) => {
    try {
      const meta = cert.metadata as Record<string, unknown> | null;
      if (cert.cert_type === "earning") {
        await generateEarningCertificatePDF({
          fullName: (meta?.full_name as string) || profile?.full_name || "User",
          amount: Number(cert.threshold_amount ?? meta?.total_commission ?? 0),
          certificateHash: cert.certificate_hash,
          issuedAt: cert.issued_at,
          milestoneDate: (meta?.milestone_date as string) || cert.issued_at,
          avatarUrl: (meta?.avatar_url as string) || profile?.avatar_url,
          adminSignatureUrl: adminSignature,
        });
        toast.success("Certificate downloaded!");
        return;
      }
      await generatePremiumCertificatePDF({
        rankName: cert.rank_name,
        fullName: (meta?.full_name as string) || profile?.full_name || "User",
        certificateHash: cert.certificate_hash,
        issuedAt: cert.issued_at,
        totalCommission: (meta?.total_commission as number) || 0,
        milestoneDate: (meta?.milestone_date as string) || cert.issued_at,
        avatarUrl: (meta?.avatar_url as string) || profile?.avatar_url,
        adminSignatureUrl: adminSignature,
        rankDescription:
          (meta?.rank_description as string) ||
          ranks?.find((r) => r.rank_name === cert.rank_name)?.description ||
          null,
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

  const claimedRanks = new Set(
    (certificates || []).filter((c) => c.cert_type !== "earning").map((c) => c.rank_name)
  );
  const claimedEarnings = new Set(
    (certificates || [])
      .filter((c) => c.cert_type === "earning")
      .map((c) => Number(c.threshold_amount))
  );

  const milestones: Milestone[] = [
    ...(ranks || []).map((rank) => ({ kind: "rank" as const, threshold: rank.min_earnings, rank })),
    ...EARNING_MILESTONES.map((threshold) => ({ kind: "earning" as const, threshold })),
  ].sort((a, b) => a.threshold - b.threshold);

  const unlockedCount = milestones.filter((m) => totalEarned >= m.threshold).length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Award className="h-7 w-7 text-primary" />
              Rank Ladder & Certificates
            </h1>
            <p className="text-muted-foreground text-sm">Track your progress and claim achievement certificates</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {pad(unlockedCount)}/{pad(milestones.length)} Unlocked
          </Badge>
        </div>

        {!canClaim && (
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
                {currentRank?.description && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">{currentRank.description}</p>
                )}
                <p className="text-sm text-muted-foreground">Total earned: {isAdmin ? "∞" : formatCurrency(totalEarned)}</p>
                {nextRank && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(nextRank.min_earnings - totalEarned)} more to reach {nextRank.rank_name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone roadmap */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {milestones.map((milestone) => {
            const achieved = totalEarned >= milestone.threshold;
            const progress = Math.min((totalEarned / milestone.threshold) * 100, 100);

            if (milestone.kind === "earning") {
              const earningClaimed = claimedEarnings.has(milestone.threshold);
              return (
                <motion.div key={`earning-${milestone.threshold}`} variants={staggerItem}>
                  <Card className={`border-dashed ${achieved ? "border-primary/25" : "opacity-70"}`}>
                    <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Award className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatCurrency(milestone.threshold)} Earning Milestone
                        </p>
                        {!achieved && (
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/70 transition-all w-[var(--progress)]" style={{ ["--progress" as string]: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {achieved && !earningClaimed && (
                          <Button size="sm" variant="outline" onClick={() => handleClaimEarningCertificate(milestone.threshold)} disabled={!canClaim} className="min-h-[44px]">
                            <Award className="h-4 w-4 mr-1" />Claim
                          </Button>
                        )}
                        {achieved && earningClaimed && <Badge variant="outline">Claimed ✓</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }

            const rank = milestone.rank;
            const claimed = claimedRanks.has(rank.rank_name);
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
                      {rank.description && (
                        <p className="text-xs text-muted-foreground mt-1">{rank.description}</p>
                      )}
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
                        <Button size="sm" onClick={() => handleClaimCertificate(rank)} disabled={!canClaim} className="min-h-[44px]">
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
