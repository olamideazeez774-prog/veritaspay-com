import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Link2, BarChart3, Wallet, ShoppingCart,
  Settings, Shield, Inbox, Wrench, QrCode,
  ChevronRight, ChevronLeft, Check, X, Sparkles,
  TrendingUp, Users, Megaphone, CreditCard, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: string;
  color: string;
}

const vendorSteps: OnboardingStep[] = [
  {
    icon: Package,
    title: "Create Your First Product",
    description: "List your digital product — courses, ebooks, templates, software — anything you want to sell. Set your price, upload a cover image, and add a compelling description.",
    action: "Go to Products → Add Product to create your first listing.",
    color: "text-primary",
  },
  {
    icon: CreditCard,
    title: "Pay Your Listing Fee",
    description: "Submit a listing payment to activate your product on the marketplace. This one-time fee ensures quality listings and keeps the platform spam-free.",
    action: "After creating a product, submit your listing payment for admin approval.",
    color: "text-accent",
  },
  {
    icon: ShoppingCart,
    title: "Track Your Sales",
    description: "Monitor every sale in real-time. See who bought, how much you earned, and track affiliate-driven sales vs direct purchases.",
    action: "Visit the Sales page to view your revenue breakdown and order history.",
    color: "text-success",
  },
  {
    icon: Wrench,
    title: "Use the Vendor Toolkit",
    description: "Create discount coupons for your products, calculate your ROI, and optimize your pricing strategy with built-in tools.",
    action: "Go to Vendor Toolkit to create coupons and use the ROI calculator.",
    color: "text-warning",
  },
  {
    icon: Wallet,
    title: "Manage Your Earnings",
    description: "Your earnings flow through pending → cleared → withdrawable stages. Once cleared, request a payout to your bank account anytime.",
    action: "Visit Wallet to track balances, then Payouts to request withdrawals.",
    color: "text-info",
  },
  {
    icon: Megaphone,
    title: "Broadcast Announcements",
    description: "Keep your affiliates informed about product updates, promotions, and important changes. Published announcements reach all affiliates instantly.",
    action: "Go to Announcements to create and publish updates for your affiliate network.",
    color: "text-primary",
  },
  {
    icon: Award,
    title: "Earn Your Verification Badge",
    description: "Build trust with a verified badge on your profile. Earn it by reaching Gold rank, or apply for paid verification in Settings.",
    action: "Check your progress in Settings → Verification Badge section.",
    color: "text-accent",
  },
];

const affiliateSteps: OnboardingStep[] = [
  {
    icon: Package,
    title: "Browse & Pick Products",
    description: "Explore the marketplace of approved digital products. Look for products with high commission rates and strong descriptions that your audience will love.",
    action: "Go to Browse Products to find products to promote.",
    color: "text-primary",
  },
  {
    icon: Link2,
    title: "Generate Affiliate Links",
    description: "Create unique tracking links for every product you want to promote. Each click is tracked, and when someone buys through your link, you earn commission automatically.",
    action: "Click 'Affiliate Link' on any product page or go to My Links to manage all your links.",
    color: "text-accent",
  },
  {
    icon: BarChart3,
    title: "Track Your Performance",
    description: "Monitor clicks, conversions, and commission earnings in real-time. See which products and campaigns are performing best.",
    action: "Visit Analytics and Stats to see your performance dashboards.",
    color: "text-success",
  },
  {
    icon: QrCode,
    title: "Use the Affiliate Toolkit",
    description: "Generate QR codes, build UTM-tracked campaign links, use the AI caption generator, and estimate your profits with the calculator.",
    action: "Go to Toolkit for QR codes, UTM builder, AI tools, and promo materials.",
    color: "text-warning",
  },
  {
    icon: Users,
    title: "Grow with Referrals",
    description: "Invite others to join the platform using your referral code. Earn second-tier commissions when the vendors they bring make sales.",
    action: "Visit Referrals to get your unique referral code and track signups.",
    color: "text-info",
  },
  {
    icon: Wallet,
    title: "Cash Out Your Earnings",
    description: "Your commissions go through pending → cleared → withdrawable stages. Once withdrawable, request a payout to your bank account.",
    action: "Visit Wallet to track earnings, then Payouts to withdraw.",
    color: "text-primary",
  },
  {
    icon: Shield,
    title: "Climb the Rank Ladder",
    description: "As you earn more, you advance through Bronze → Silver → Gold → Platinum → Diamond ranks. Higher ranks unlock commission boosts and fee discounts.",
    action: "Check Certificates to see your current rank and claim achievement certificates.",
    color: "text-accent",
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user, isVendor, isAffiliate } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const steps = isVendor ? vendorSteps : affiliateSteps;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Save progress to DB
  useEffect(() => {
    if (!user) return;
    const role = isVendor ? "vendor" : "affiliate";
    supabase.from("onboarding_progress").upsert({
      user_id: user.id,
      role,
      current_step: currentStep,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).then(() => {});
  }, [currentStep, user]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(s => s - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    const role = isVendor ? "vendor" : "affiliate";
    await supabase.from("onboarding_progress").upsert({
      user_id: user.id,
      role,
      current_step: totalSteps - 1,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    onComplete();
  };

  const step = steps[currentStep];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">
              Welcome to VeritasPay
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVendor ? "Vendor" : "Affiliate"} Quick Start Guide
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" /> Skip
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="glass-card p-6 sm:p-8 overflow-hidden min-h-[320px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center text-center space-y-5"
            >
              {/* Icon */}
              <div className={cn(
                "h-20 w-20 rounded-2xl flex items-center justify-center bg-muted/50 border-2 border-border",
              )}>
                <step.icon className={cn("h-10 w-10", step.color)} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold">{step.title}</h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {step.description}
              </p>

              {/* Action */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 w-full">
                <p className="text-xs font-medium text-primary flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {step.action}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > currentStep ? 1 : -1); setCurrentStep(i); }}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === currentStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="min-h-[44px]"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Done
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
