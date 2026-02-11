import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { CheckCircle, XCircle, Award } from "lucide-react";
import { PLATFORM_NAME } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/format";

const RANK_ICONS: Record<string, string> = {
  Bronze: "🥉", Silver: "🥈", Gold: "🏅", Diamond: "💎", Platinum: "⬡", Elite: "👑",
};

export default function VerifyCertificate() {
  const { hash } = useParams<{ hash: string }>();

  const { data: cert, isLoading } = useQuery({
    queryKey: ["verify-certificate", hash],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_hash", hash)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", data.user_id)
        .single();

      return { ...data, profile };
    },
    enabled: !!hash,
  });

  const metadata = cert?.metadata as Record<string, any> | null;
  const affiliateName = cert?.profile?.full_name || metadata?.full_name || "Unknown";
  const avatarUrl = cert?.profile?.avatar_url || metadata?.avatar_url;
  const rankIcon = RANK_ICONS[cert?.rank_name || ""] || "🏅";

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <Link to="/">
            <span className="text-2xl font-bold text-gradient-primary">{PLATFORM_NAME}</span>
          </Link>
          <h2 className="text-xl font-bold">Certificate Verification</h2>

          {isLoading ? (
            <AnimatedLoading size="md" text="Verifying..." />
          ) : cert ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-success">Certificate Valid ✓</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                {avatarUrl && (
                  <div className="flex justify-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>{affiliateName[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <p className="text-lg font-semibold text-foreground">{affiliateName}</p>
                <p>Rank: <Badge className="ml-1">{rankIcon} {cert.rank_name}</Badge></p>
                {metadata?.total_commission && (
                  <p>Total Verified Earnings: <span className="font-semibold text-foreground">{formatCurrency(metadata.total_commission)}</span></p>
                )}
                <p className="font-mono text-xs">{cert.certificate_hash}</p>
                <p>Issued: {formatDate(cert.issued_at)}</p>
                {metadata?.is_preview && (
                  <Badge variant="outline" className="text-xs">Preview Certificate</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-destructive">Certificate Not Found</h3>
              <p className="text-sm text-muted-foreground">This certificate ID does not exist or may be invalid.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
