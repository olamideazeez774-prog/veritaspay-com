import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useVendorStats, useAffiliateStats } from "@/hooks/useStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency } from "@/lib/format";
import { 
  Package, ShoppingCart, Wallet, TrendingUp, Link2, MousePointer, Target,
  ArrowRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RoleSelector } from "@/components/dashboard/RoleSelector";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export default function Dashboard() {
  const { user, roles, isVendor, isAffiliate } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: vendorStats, isLoading: vendorLoading } = useVendorStats(isVendor ? user?.id : undefined);
  const { data: affiliateStats, isLoading: affiliateLoading } = useAffiliateStats(isAffiliate ? user?.id : undefined);

  // Check if user needs onboarding
  const { data: onboardingProgress } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && (isVendor || isAffiliate),
  });

  // Show onboarding for new users who haven't completed it
  const needsOnboarding = (isVendor || isAffiliate) && !onboardingProgress?.completed && onboardingProgress === null;

  // Auto-show onboarding on first visit
  const { data: _trigger } = useQuery({
    queryKey: ["onboarding-trigger", user?.id, needsOnboarding],
    queryFn: () => {
      if (needsOnboarding) setShowOnboarding(true);
      return true;
    },
    enabled: needsOnboarding === true,
    staleTime: Infinity,
  });

  // Fetch latest daily digest
  const { data: latestDigest } = useQuery({
    queryKey: ["latest-digest", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_digests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasNoRoles = !isVendor && !isAffiliate;

  return (
    <DashboardLayout>
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back! Here's an overview of your account.</p>
        </motion.div>

        {hasNoRoles && <RoleSelector />}

        {/* Daily Digest */}
        {latestDigest && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Daily Digest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {typeof latestDigest.content === "string"
                    ? latestDigest.content
                    : (latestDigest.content as any)?.summary || JSON.stringify(latestDigest.content)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Vendor Stats */}
        {isVendor && vendorStats && (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">Vendor Overview</h2>
              <Link to="/dashboard/products">
                <Button variant="ghost" size="sm">View Products <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <motion.div variants={staggerItem}><StatCard title="Total Products" value={vendorStats.totalProducts} subtitle={`${vendorStats.activeProducts} active`} icon={Package} /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Total Sales" value={vendorStats.totalSales} icon={ShoppingCart} variant="primary" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Total Revenue" value={formatCurrency(vendorStats.totalRevenue)} icon={TrendingUp} variant="success" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Withdrawable" value={formatCurrency(vendorStats.withdrawableBalance)} subtitle={`${formatCurrency(vendorStats.pendingEarnings)} pending`} icon={Wallet} variant="accent" /></motion.div>
            </div>
          </motion.div>
        )}

        {/* Affiliate Stats */}
        {isAffiliate && affiliateStats && (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">Affiliate Overview</h2>
              <Link to="/dashboard/links">
                <Button variant="ghost" size="sm">Manage Links <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <motion.div variants={staggerItem}><StatCard title="Active Links" value={affiliateStats.totalLinks} icon={Link2} /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Total Clicks" value={affiliateStats.totalClicks} icon={MousePointer} variant="primary" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Conversions" value={affiliateStats.totalConversions} subtitle={`${affiliateStats.conversionRate.toFixed(1)}% rate`} icon={Target} variant="success" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Withdrawable" value={formatCurrency(affiliateStats.withdrawableBalance)} subtitle={`${formatCurrency(affiliateStats.pendingEarnings)} pending`} icon={Wallet} variant="accent" /></motion.div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        {(isVendor || isAffiliate) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 sm:p-6">
            <h3 className="mb-4 font-serif text-lg font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {isVendor && (
                <>
                  <Link to="/dashboard/products/new"><Button className="min-h-[44px]"><Package className="mr-2 h-4 w-4" />Add Product</Button></Link>
                  <Link to="/dashboard/sales"><Button variant="outline" className="min-h-[44px]">View Sales</Button></Link>
                </>
              )}
              {isAffiliate && (
                <>
                  <Link to="/marketplace"><Button className="min-h-[44px]"><Link2 className="mr-2 h-4 w-4" />Browse Products</Button></Link>
                  <Link to="/dashboard/stats"><Button variant="outline" className="min-h-[44px]">View Analytics</Button></Link>
                </>
              )}
              <Link to="/dashboard/wallet"><Button variant="outline" className="min-h-[44px]"><Wallet className="mr-2 h-4 w-4" />View Wallet</Button></Link>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
