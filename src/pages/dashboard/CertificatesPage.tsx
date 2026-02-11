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
  metadata: Record<string, any> | null;
}

const RANK_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🏅",
  Diamond: "💎",
  Platinum: "⬡",
  Elite: "👑",
};

const RANK_DESIGNS: Record<string, {
  bg: string; accent: string; borderStyle: "single" | "double" | "triple" | "diamond" | "metallic" | "elite";
}> = {
  Bronze: { bg: "#1e293b", accent: "#b87333", borderStyle: "single" },
  Silver: { bg: "#374151", accent: "#c0c0c0", borderStyle: "double" },
  Gold: { bg: "#0f172a", accent: "#d4af37", borderStyle: "triple" },
  Diamond: { bg: "#030712", accent: "#93c5fd", borderStyle: "diamond" },
  Platinum: { bg: "#1e1b4b", accent: "#e5e7eb", borderStyle: "metallic" },
  Elite: { bg: "#000000", accent: "#f59e0b", borderStyle: "elite" },
};

export default function CertificatesPage() {
  const { user, profile, isAdmin } = useAuth();

  const { data: ranks } = useQuery({
    queryKey: ["affiliate-ranks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_ranks")
        .select("*")
        .order("sort_order", { ascending: true });
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
        .order("issued_at", { ascending: false });
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
    
    const metadata: Record<string, any> = {
      full_name: profile?.full_name,
      email: profile?.email,
      total_commission: totalEarned,
      milestone_date: new Date().toISOString(),
      platform_name: PLATFORM_NAME,
      avatar_url: profile?.avatar_url,
    };

    if (isAdmin) {
      metadata.is_preview = true;
    }

    const { error } = await supabase.from("certificates").insert({
      user_id: user.id,
      rank_name: rankName,
      certificate_hash: hash,
      metadata: metadata as any,
    });

    if (error) {
      if (error.code === "23505") toast.info("Certificate already claimed!");
      else toast.error("Failed to claim certificate");
    } else {
      toast.success(`${rankName} certificate claimed!`);
      refetchCerts();
    }
  };

  const drawBorders = (doc: any, design: typeof RANK_DESIGNS.Bronze, hexToRgb: (h: string) => [number, number, number]) => {
    const [brR, brG, brB] = hexToRgb(design.accent);
    doc.setDrawColor(brR, brG, brB);

    switch (design.borderStyle) {
      case "single":
        doc.setLineWidth(1.5);
        doc.rect(10, 10, 277, 190);
        break;
      case "double":
        doc.setLineWidth(1);
        doc.rect(8, 8, 281, 194);
        doc.rect(13, 13, 271, 184);
        break;
      case "triple":
        doc.setLineWidth(1.5);
        doc.rect(6, 6, 285, 198);
        doc.setLineWidth(0.8);
        doc.rect(10, 10, 277, 190);
        doc.rect(14, 14, 269, 182);
        break;
      case "diamond":
        doc.setLineWidth(0.8);
        for (let i = 0; i < 4; i++) {
          doc.rect(6 + i * 3, 6 + i * 3, 285 - i * 6, 198 - i * 6);
        }
        break;
      case "metallic":
        doc.setLineWidth(2.5);
        doc.rect(8, 8, 281, 194);
        doc.setLineWidth(0.5);
        doc.rect(14, 14, 269, 182);
        break;
      case "elite":
        doc.setLineWidth(3);
        doc.rect(6, 6, 285, 198);
        doc.setLineWidth(1);
        doc.rect(12, 12, 273, 186);
        // Corner sparkle dots
        const corners = [[18, 18], [18, 192], [279, 18], [279, 192]];
        doc.setFillColor(brR, brG, brB);
        corners.forEach(([x, y]) => {
          doc.circle(x, y, 2, "F");
          doc.circle(x + 4, y, 1, "F");
          doc.circle(x, y + 4, 1, "F");
        });
        break;
    }
  };

  const drawSeal = (doc: any, x: number, y: number, hexToRgb: (h: string) => [number, number, number], accentColor: string) => {
    const [r, g, b] = hexToRgb(accentColor);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.5);
    doc.circle(x, y, 14);
    doc.setLineWidth(0.5);
    doc.circle(x, y, 11);
    doc.circle(x, y, 8);
    doc.setFontSize(6);
    doc.setTextColor(r, g, b);
    doc.text("VERIFIED", x, y - 2, { align: "center" });
    doc.text("•  AUTHENTIC  •", x, y + 3, { align: "center" });
  };

  const handleDownloadCert = async (cert: Certificate) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const design = RANK_DESIGNS[cert.rank_name] || RANK_DESIGNS.Bronze;
      const rankIcon = RANK_ICONS[cert.rank_name] || "🏅";
      const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      const [bgR, bgG, bgB] = hexToRgb(design.bg);
      const [tcR, tcG, tcB] = hexToRgb(design.accent);

      // Background
      doc.setFillColor(bgR, bgG, bgB);
      doc.rect(0, 0, 297, 210, "F");

      // Rank-specific borders
      drawBorders(doc, design, hexToRgb);

      // Rank icon watermark
      doc.setFontSize(100);
      doc.setTextColor(tcR, tcG, tcB);
      doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
      doc.text(rankIcon, 148.5, 130, { align: "center" });
      doc.setGState(new (doc as any).GState({ opacity: 1 }));

      // Title: CERTIFICATE OF ACHIEVEMENT
      doc.setTextColor(tcR, tcG, tcB);
      doc.setFontSize(28);
      doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 40, { align: "center" });

      // Decorative lines
      doc.setDrawColor(tcR, tcG, tcB);
      doc.setLineWidth(0.5);
      doc.line(55, 46, 242, 46);
      doc.setLineWidth(0.3);
      doc.line(70, 48, 227, 48);

      // Rank name with icon
      doc.setFontSize(22);
      doc.text(`${rankIcon}  ${cert.rank_name.toUpperCase()} RANK  ${rankIcon}`, 148.5, 62, { align: "center" });

      // "Awarded to"
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      doc.text("Awarded to", 148.5, 78, { align: "center" });

      // Affiliate name
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      const name = (cert.metadata as any)?.full_name || profile?.full_name || "User";
      doc.text(name, 148.5, 92, { align: "center" });

      // Body copy
      doc.setFontSize(10);
      doc.setTextColor(170, 170, 170);
      const bodyLines = doc.splitTextToSize(
        "In recognition of outstanding performance and verified achievement on VeritasPay, demonstrating exceptional results and commitment to platform excellence.",
        200
      );
      doc.text(bodyLines, 148.5, 106, { align: "center" });

      // Earnings & milestone
      const commission = (cert.metadata as any)?.total_commission;
      const milestoneDate = (cert.metadata as any)?.milestone_date || cert.issued_at;
      doc.setFontSize(11);
      doc.setTextColor(tcR, tcG, tcB);
      if (commission) {
        doc.text(`Total Verified Earnings: ${formatCurrency(commission)}`, 148.5, 125, { align: "center" });
      }
      doc.text(`Rank Milestone Achieved: ${formatDate(milestoneDate)}`, 148.5, 133, { align: "center" });

      // Signature line
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.3);
      doc.line(105, 160, 190, 160);

      if (adminSignature) {
        try {
          doc.addImage(adminSignature, "PNG", 125, 143, 45, 17);
        } catch { /* skip */ }
      }

      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text("Chief Executive Officer", 148.5, 167, { align: "center" });

      // Embossed seal
      drawSeal(doc, 52, 155, hexToRgb, design.accent);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Certificate ID: ${cert.certificate_hash}`, 148.5, 182, { align: "center" });
      doc.text(`Issue Date: ${formatDate(cert.issued_at)}`, 148.5, 187, { align: "center" });
      doc.text(`Verify at: ${window.location.origin}/verify-certificate/${cert.certificate_hash}`, 148.5, 192, { align: "center" });

      // Platform branding top-left
      doc.setFontSize(10);
      doc.setTextColor(tcR, tcG, tcB);
      doc.text(PLATFORM_NAME, 20, 20);

      doc.save(`${PLATFORM_NAME}-${cert.rank_name}-Certificate.pdf`);
      toast.success("Certificate downloaded!");
    } catch (err) {
      console.error("PDF generation error:", err);
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

  const earnedRanks = ranks?.filter((r) => totalEarned >= r.min_earnings) || [];
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

        {isAdmin && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span><strong>Preview Mode</strong> — These are sample certificates for QA. Admin certificates do not affect the leaderboard or grant rewards.</span>
          </div>
        )}

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
              <div className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
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
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: achieved ? rank.badge_color : "#444" }}>
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
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
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
                      {(cert.metadata as any)?.is_preview && <Badge variant="outline" className="text-xs">Preview</Badge>}
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
