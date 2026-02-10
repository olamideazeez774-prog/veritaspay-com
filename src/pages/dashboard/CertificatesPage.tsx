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

const RANK_DESIGNS: Record<string, {
  bg: string; titleColor: string; borderColor: string; badgeChar: string; badgeShape: string;
}> = {
  Bronze: { bg: "#1e293b", titleColor: "#b87333", borderColor: "#b87333", badgeChar: "B", badgeShape: "circle" },
  Silver: { bg: "#374151", titleColor: "#c0c0c0", borderColor: "#c0c0c0", badgeChar: "S", badgeShape: "shield" },
  Gold: { bg: "#0f172a", titleColor: "#d4af37", borderColor: "#d4af37", badgeChar: "G", badgeShape: "star" },
  Diamond: { bg: "#030712", titleColor: "#93c5fd", borderColor: "#93c5fd", badgeChar: "D", badgeShape: "diamond" },
  Platinum: { bg: "#1e1b4b", titleColor: "#e5e7eb", borderColor: "#e5e7eb", badgeChar: "P", badgeShape: "hexagon" },
  Elite: { bg: "#000000", titleColor: "#f59e0b", borderColor: "#f59e0b", badgeChar: "E", badgeShape: "crown" },
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

  // Admin sees all ranks as achieved for preview
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

  const handleDownloadCert = async (cert: Certificate) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const design = RANK_DESIGNS[cert.rank_name] || RANK_DESIGNS.Bronze;
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b] as [number, number, number];
      };
      const [bgR, bgG, bgB] = hexToRgb(design.bg);
      const [tcR, tcG, tcB] = hexToRgb(design.titleColor);
      const [brR, brG, brB] = hexToRgb(design.borderColor);

      // Background
      doc.setFillColor(bgR, bgG, bgB);
      doc.rect(0, 0, 297, 210, "F");

      // Borders - each rank gets different border style
      doc.setDrawColor(brR, brG, brB);
      if (cert.rank_name === "Bronze") {
        doc.setLineWidth(1);
        doc.rect(10, 10, 277, 190);
      } else if (cert.rank_name === "Silver") {
        doc.setLineWidth(1);
        doc.rect(8, 8, 281, 194);
        doc.rect(12, 12, 273, 186);
      } else if (cert.rank_name === "Gold") {
        doc.setLineWidth(1.5);
        doc.rect(6, 6, 285, 198);
        doc.rect(10, 10, 277, 190);
        doc.rect(14, 14, 269, 182);
      } else if (cert.rank_name === "Diamond") {
        doc.setLineWidth(1);
        for (let i = 0; i < 4; i++) {
          doc.rect(6 + i * 3, 6 + i * 3, 285 - i * 6, 198 - i * 6);
        }
      } else if (cert.rank_name === "Platinum") {
        doc.setLineWidth(2);
        doc.rect(8, 8, 281, 194);
        doc.setLineWidth(0.5);
        doc.rect(13, 13, 271, 184);
      } else {
        doc.setLineWidth(2.5);
        doc.rect(6, 6, 285, 198);
        doc.setLineWidth(1);
        doc.rect(12, 12, 273, 186);
      }

      // Rank badge watermark
      doc.setFontSize(120);
      doc.setTextColor(tcR, tcG, tcB);
      doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
      doc.text(design.badgeChar, 148.5, 130, { align: "center" });
      doc.setGState(new (doc as any).GState({ opacity: 1 }));

      // Title
      doc.setTextColor(tcR, tcG, tcB);
      doc.setFontSize(32);
      doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 45, { align: "center" });

      // Decorative line
      doc.setDrawColor(tcR, tcG, tcB);
      doc.setLineWidth(0.5);
      doc.line(60, 52, 237, 52);

      // Rank name
      doc.setFontSize(26);
      doc.text(`${cert.rank_name.toUpperCase()} RANK`, 148.5, 70, { align: "center" });

      // "Awarded to" label
      doc.setFontSize(12);
      doc.setTextColor(180, 180, 180);
      doc.text("This certificate is proudly awarded to", 148.5, 88, { align: "center" });

      // Affiliate name
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      const name = (cert.metadata as any)?.full_name || profile?.full_name || "User";
      doc.text(name, 148.5, 105, { align: "center" });

      // Achievement description
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      const commission = (cert.metadata as any)?.total_commission;
      const commissionText = commission ? ` with ${formatCurrency(commission)} total earnings` : "";
      doc.text(
        `For achieving ${cert.rank_name} rank on ${PLATFORM_NAME}${commissionText}`,
        148.5, 120, { align: "center" }
      );

      // Milestone date
      const milestoneDate = (cert.metadata as any)?.milestone_date || cert.issued_at;
      doc.text(`Milestone achieved: ${formatDate(milestoneDate)}`, 148.5, 130, { align: "center" });

      // Admin signature
      if (adminSignature) {
        try {
          doc.addImage(adminSignature, "PNG", 110, 140, 40, 20);
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text("Platform Administrator", 130, 165, { align: "center" });
        } catch {
          // Signature rendering failed, skip
        }
      }

      // Certificate ID & verification
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Certificate ID: ${cert.certificate_hash}`, 148.5, 178, { align: "center" });
      doc.text(`Issued: ${formatDate(cert.issued_at)}`, 148.5, 185, { align: "center" });
      doc.text(`Verify at: ${window.location.origin}/verify-certificate/${cert.certificate_hash}`, 148.5, 192, { align: "center" });

      // Preview watermark for admin
      if ((cert.metadata as any)?.is_preview) {
        doc.setFontSize(60);
        doc.setTextColor(255, 0, 0);
        doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
        doc.text("PREVIEW", 148.5, 110, { align: "center", angle: 30 });
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }

      doc.save(`${PLATFORM_NAME}-${cert.rank_name}-Certificate.pdf`);
      toast.success("Certificate downloaded!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadPNG = async (cert: Certificate) => {
    try {
      // Generate PDF and convert to blob for download as image fallback
      toast.info("PNG export uses PDF format for best quality. Downloading PDF...");
      await handleDownloadCert(cert);
    } catch {
      toast.error("Failed to export");
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

        {/* Admin Preview Banner */}
        {isAdmin && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span><strong>Preview Mode</strong> — These are sample certificates for QA. Admin certificates do not affect the leaderboard or grant rewards.</span>
          </div>
        )}

        {/* Signature Warning */}
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
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: currentRank?.badge_color || "#666", color: "#fff" }}
              >
                {currentRank?.rank_name?.[0] || "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{isAdmin ? "Elite (Admin)" : (currentRank?.rank_name || "Unranked")}</h2>
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

            return (
              <motion.div key={rank.id} variants={staggerItem}>
                <Card className={achieved ? "border-primary/30" : "opacity-70"}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ backgroundColor: achieved ? rank.badge_color : "#444", color: "#fff" }}
                    >
                      {rank.rank_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{rank.rank_name}</p>
                        {achieved && <Shield className="h-4 w-4 text-success" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(rank.min_earnings)} earnings required
                      </p>
                      {!achieved && (
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {achieved && !claimed && (
                        <Button size="sm" onClick={() => handleClaimCertificate(rank.rank_name)} disabled={!adminSignature && !isAdmin}>
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
                      <p className="font-semibold">{cert.rank_name} Achievement</p>
                      {(cert.metadata as any)?.is_preview && <Badge variant="outline" className="text-xs">Preview</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{cert.certificate_hash}</p>
                    <p className="text-xs text-muted-foreground">Issued: {formatDate(cert.issued_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadCert(cert)}>
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
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
