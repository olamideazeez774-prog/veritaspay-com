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
  ArrowRight, Sparkles, Compass, CircleCheck, Plus, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RoleSelector } from "@/components/dashboard/RoleSelector";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { FeatureGate } from "@/components/FeatureGate";

function NextActionCard({
  isVendor,
  isAffiliate,
  productCount,
  linkCount,
}: {
  isVendor: boolean;
  isAffiliate: boolean;
  productCount: number;
  linkCount: number;
}) {
  const action = isVendor
    ? productCount === 0
      ? { eyebrow: "Your first win", title: "List your first digital product", description: "Create a clear product page, set your price, and let affiliates help you reach more buyers.", href: "/dashboard/products/new", label: "Add a product", icon: Plus }
      : { eyebrow: "Keep the momentum", title: "Review your product shelf", description: "Check what is active, update your listings, and see which products are ready for more promotion.", href: "/dashboard/products", label: "View products", icon: Package }
    : linkCount === 0
      ? { eyebrow: "Your first win", title: "Find a product worth sharing", description: "Browse the marketplace, choose a product your audience will value, and create your first tracked link.", href: "/marketplace", label: "Browse marketplace", icon: Compass }
      : { eyebrow: "Keep the momentum", title: "Check your affiliate performance", description: "See your clicks, conversions, and earnings so you can focus on what is already working.", href: "/dashboard/stats", label: "View analytics", icon: TrendingUp };

  const Icon = action.icon;
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 shadow-sm">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{action.eyebrow}</p>
            <h2 className="mt-1 font-serif text-xl font-semibold sm:text-2xl">{action.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{action.description}</p>
          </div>
        </div>
        <Button asChild className="min-h-11 shrink-0 gap-2 sm:self-end">
          <Link to={action.href}>{action.label}<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, profile, roles, isVendor, isAffiliate } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: vendorStats } = useVendorStats(isVendor ? user?.id : undefined);
  const { data: affiliateStats } = useAffiliateStats(isAffiliate ? user?.id : undefined);

  const { data: onboardingProgress } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("onboarding_progress").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && (isVendor || isAffiliate),
  });

  const needsOnboarding = (isVendor || isAffiliate) && !onboardingProgress?.completed && onboardingProgress === null;

  useQuery({
    queryKey: ["onboarding-trigger", user?.id, needsOnboarding],
    queryFn: () => {
      if (needsOnboarding) setShowOnboarding(true);
      return true;
    },
    enabled: needsOnboarding === true,
    staleTime: Infinity,
  });

  const { data: latestDigest } = useQuery({
    queryKey: ["latest-digest", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("daily_digests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasNoRoles = roles.length === 0;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <DashboardLayout>
      {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} onSkip={() => setShowOnboarding(false)} />}

      <div className="space-y-6 sm:space-y-8">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Your workspace</p>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {hasNoRoles ? "Choose how you want to use Mirvyn and we will set up the right workspace for you." : "Everything you need to sell, promote, and get paid is right here."}
            </p>
          </div>
          {!hasNoRoles && <Button variant="outline" className="min-h-11 gap-2 self-start sm:self-auto" onClick={() => setShowOnboarding(true)}><Compass className="h-4 w-4" />Quick tour</Button>}
        </motion.header>

        {hasNoRoles && (
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">Start with one simple choice</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose Vendor if you want to sell your own products, or Affiliate if you want to earn by promoting products you believe in.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasNoRoles && <RoleSelector />}

        {!hasNoRoles && (
          <NextActionCard isVendor={isVendor} isAffiliate={isAffiliate} productCount={vendorStats?.totalProducts || 0} linkCount={affiliateStats?.totalLinks || 0} />
        )}

        {latestDigest && (
          <FeatureGate flag="daily_digest">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />Daily digest</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{typeof latestDigest.content === "string" ? latestDigest.content : (latestDigest.content as Record<string, string>)?.summary || JSON.stringify(latestDigest.content)}</p></CardContent>
            </Card>
          </FeatureGate>
        )}

        {isVendor && vendorStats && (
          <motion.section variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sell</p><h2 className="mt-1 font-serif text-2xl font-semibold">Your vendor overview</h2></div><Button asChild variant="ghost" size="sm" className="shrink-0"><Link to="/dashboard/products">View products <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <motion.div variants={staggerItem}><StatCard title="Products" value={vendorStats.totalProducts} subtitle={`${vendorStats.activeProducts} active`} icon={Package} /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Sales" value={vendorStats.totalSales} icon={ShoppingCart} variant="primary" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Revenue" value={formatCurrency(vendorStats.totalRevenue)} icon={TrendingUp} variant="success" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Withdrawable" value={formatCurrency(vendorStats.withdrawableBalance)} subtitle={`${formatCurrency(vendorStats.pendingEarnings)} pending`} icon={Wallet} variant="accent" /></motion.div>
            </div>
          </motion.section>
        )}

        {isAffiliate && affiliateStats && (
          <motion.section variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Promote</p><h2 className="mt-1 font-serif text-2xl font-semibold">Your affiliate overview</h2></div><Button asChild variant="ghost" size="sm" className="shrink-0"><Link to="/dashboard/links">Manage links <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <motion.div variants={staggerItem}><StatCard title="Active links" value={affiliateStats.totalLinks} icon={Link2} /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Clicks" value={affiliateStats.totalClicks} icon={MousePointer} variant="primary" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Conversions" value={affiliateStats.totalConversions} subtitle={`${affiliateStats.conversionRate.toFixed(1)}% rate`} icon={Target} variant="success" /></motion.div>
              <motion.div variants={staggerItem}><StatCard title="Withdrawable" value={formatCurrency(affiliateStats.withdrawableBalance)} subtitle={`${formatCurrency(affiliateStats.pendingEarnings)} pending`} icon={Wallet} variant="accent" /></motion.div>
            </div>
          </motion.section>
        )}

        {!hasNoRoles && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="font-serif text-xl">Common next steps</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isVendor && <Button asChild variant="outline" className="min-h-12 justify-start gap-3"><Link to="/dashboard/products/new"><Package className="h-4 w-4 text-primary" />Add a product <ArrowRight className="ml-auto h-4 w-4" /></Link></Button>}
              {isAffiliate && <Button asChild variant="outline" className="min-h-12 justify-start gap-3"><Link to="/marketplace"><Compass className="h-4 w-4 text-primary" />Browse products <ArrowRight className="ml-auto h-4 w-4" /></Link></Button>}
              <Button asChild variant="outline" className="min-h-12 justify-start gap-3"><Link to="/dashboard/wallet"><Wallet className="h-4 w-4 text-primary" />Check wallet <ArrowRight className="ml-auto h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" className="min-h-12 justify-start gap-3"><Link to="/dashboard/payouts"><CreditCard className="h-4 w-4 text-primary" />Withdraw earnings <ArrowRight className="ml-auto h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
