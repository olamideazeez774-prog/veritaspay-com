import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Award, Download, Share2, Shield, ExternalLink } from "lucide-react";
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
}

export default function CertificatesPage() {
  const { user, profile } = useAuth();
  const certRef = useRef<HTMLDivElement>(null);

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

  const totalEarned = wallet?.total_earned || 0;
  const currentRank = ranks?.filter((r) => totalEarned >= r.min_earnings).pop();
  const nextRank = ranks?.find((r) => totalEarned < r.min_earnings);

  const handleClaimCertificate = async (rankName: string) => {
    if (!user) return;
    const hash = `VP-${rankName.toUpperCase()}-${user.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase();
    
    const { error } = await supabase.from("certificates").insert({
      user_id: user.id,
      rank_name: rankName,
      certificate_hash: hash,
      metadata: { full_name: profile?.full_name, email: profile?.email } as any,
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
      
      // Background
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 210, "F");
      
      // Border
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      doc.rect(15, 15, 267, 180);

      // Title
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(36);
      doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 50, { align: "center" });

      // Rank
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text(cert.rank_name.toUpperCase() + " RANK", 148.5, 75, { align: "center" });

      // Awarded to
      doc.setFontSize(14);
      doc.setTextColor(180, 180, 180);
      doc.text("This certificate is awarded to", 148.5, 95, { align: "center" });

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text(profile?.full_name || "User", 148.5, 115, { align: "center" });

      // Description
      doc.setFontSize(12);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `For achieving ${cert.rank_name} rank on ${PLATFORM_NAME}`,
        148.5, 135, { align: "center" }
      );

      // Certificate ID
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Certificate ID: ${cert.certificate_hash}`, 148.5, 165, { align: "center" });
      doc.text(`Issued: ${formatDate(cert.issued_at)}`, 148.5, 175, { align: "center" });
      doc.text(`Verify at: ${window.location.origin}/verify-certificate/${cert.certificate_hash}`, 148.5, 185, { align: "center" });

      doc.save(`${PLATFORM_NAME}-${cert.rank_name}-Certificate.pdf`);
      toast.success("Certificate downloaded!");
    } catch {
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
                <h2 className="text-xl font-bold">{currentRank?.rank_name || "Unranked"}</h2>
                <p className="text-sm text-muted-foreground">Total earned: {formatCurrency(totalEarned)}</p>
                {nextRank && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(nextRank.min_earnings - totalEarned)} more to reach {nextRank.rank_name}
                  </p>
                )}
              </div>
              {currentRank && (
                <div className="text-right">
                  <Badge>{currentRank.fee_discount_percent}% fee discount</Badge>
                  <Badge variant="secondary" className="ml-2">+{currentRank.commission_boost_percent}% commission</Badge>
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
                        <Button size="sm" onClick={() => handleClaimCertificate(rank.rank_name)}>
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
                    <p className="font-semibold">{cert.rank_name} Achievement</p>
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
