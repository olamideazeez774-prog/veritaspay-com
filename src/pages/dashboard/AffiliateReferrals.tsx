import { motion } from "framer-motion";
import { Users, Copy, Link as LinkIcon, TrendingUp, UserPlus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateReferralCode, useReferredUsers } from "@/hooks/useReferrals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ShareMenu } from "@/components/ui/share-menu";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/constants";

export default function AffiliateReferrals() {
  const { user } = useAuth();
  const { data: referralCode, isLoading: loadingCode } = useAffiliateReferralCode(user?.id);
  const { data: referredUsers, isLoading: loadingUsers } = useReferredUsers(user?.id);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode.referral_code}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const isLoading = loadingCode || loadingUsers;

  // Calculate stats
  const totalReferrals = referredUsers?.length || 0;
  const vendorReferrals = referredUsers?.filter((r) => r.roles.includes("vendor")).length || 0;
  const affiliateReferrals = referredUsers?.filter((r) => r.roles.includes("affiliate")).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Referrals</h1>
          <p className="text-muted-foreground">
            Invite users to {PLATFORM_NAME} and earn from their activity
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <AnimatedLoading size="lg" text="Loading referral data..." />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Referral Link Card */}
            <motion.div variants={staggerItem}>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    Your Referral Link
                  </CardTitle>
                  <CardDescription>
                    Share this link to invite new users to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 p-3 rounded-lg bg-background border font-mono text-sm break-all">
                      {referralLink || "Loading..."}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCopyLink} disabled={!referralLink} variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <ShareMenu
                        url={referralLink}
                        title={`Join ${PLATFORM_NAME} and start earning!`}
                        variant="destructive"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Your code:</span>
                      <Badge
                        variant="secondary"
                        className="font-mono cursor-pointer hover:bg-secondary/80"
                        onClick={handleCopyCode}
                      >
                        {referralCode?.referral_code || "..."}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats */}
            <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Total Referrals"
                value={totalReferrals.toString()}
                icon={Users}
              />
              <StatCard
                title="Vendors Referred"
                value={vendorReferrals.toString()}
                icon={TrendingUp}
              />
              <StatCard
                title="Affiliates Referred"
                value={affiliateReferrals.toString()}
                icon={UserPlus}
              />
            </motion.div>

            {/* How it Works */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle>How Referral Earnings Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="text-primary font-bold">1</span>
                      </div>
                      <h4 className="font-semibold mb-1">Share Your Link</h4>
                      <p className="text-sm text-muted-foreground">
                        Invite friends and contacts to join {PLATFORM_NAME}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="text-primary font-bold">2</span>
                      </div>
                      <h4 className="font-semibold mb-1">They Join & Sell</h4>
                      <p className="text-sm text-muted-foreground">
                        When they become vendors and make sales, you earn
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="text-primary font-bold">3</span>
                      </div>
                      <h4 className="font-semibold mb-1">Earn Commissions</h4>
                      <p className="text-sm text-muted-foreground">
                        Get 5% override on all their product sales
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Referred Users Table */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle>Your Referrals</CardTitle>
                  <CardDescription>Users who joined through your referral link</CardDescription>
                </CardHeader>
                <CardContent>
                  {!referredUsers || referredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 font-semibold">No referrals yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Share your referral link to start earning
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referredUsers.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{referral.profile?.full_name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{referral.profile?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {referral.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className="capitalize">
                                    {role}
                                  </Badge>
                                ))}
                                {referral.roles.length === 0 && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(referral.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-success/10 text-success border-success/20">
                                Active
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
