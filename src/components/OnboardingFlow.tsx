import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Link2, BarChart3, Wallet, ShoppingCart, ChevronRight, ChevronLeft, Check, X, Sparkles, Users, Store } from "lucide-react";
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
  { icon: Package, title: "Create your first product", description: "Add a course, ebook, template, or other digital product. Set a clear price and explain the result buyers will get.", action: "Start in Products → Add product.", color: "text-primary" },
  { icon: Store, title: "Publish with confidence", description: "Pay the fixed one-time ₦2,000 course listing fee, then your product can move through review and appear in the marketplace.", action: "Finish the listing payment from your product form.", color: "text-accent" },
  { icon: Users, title: "Let affiliates extend your reach", description: "Keep your affiliate setting on and choose a commission that makes your product worth promoting. Your links and sales stay visible in one place.", action: "Use Vendor Toolkit and Announcements to support promotion.", color: "text-success" },
  { icon: Wallet, title: "Watch sales and withdraw", description: "Follow earnings from pending to withdrawable. When your balance is ready, request a payout from Wallet or Payouts.", action: "Open Wallet whenever you want the complete money picture.", color: "text-info" },
];

const affiliateSteps: OnboardingStep[] = [
  { icon: ShoppingCart, title: "Find products your audience needs", description: "Browse the marketplace and look for products with a clear promise, strong description, and a commission worth your effort.", action: "Start in Browse products.", color: "text-primary" },
  { icon: Link2, title: "Create one tracked link", description: "Generate your unique link from a product page. Every click and conversion is connected to your account automatically.", action: "Choose Affiliate link on any product you want to promote.", color: "text-accent" },
  { icon: BarChart3, title: "Share, learn, improve", description: "Share your link where your audience already pays attention, then use Stats to see which products and channels are working.", action: "Review clicks and conversions before changing your strategy.", color: "text-success" },
  { icon: Wallet, title: "Cash out when cleared", description: "Your commissions move through pending, cleared, and withdrawable states. The minimum withdrawal is ₦3,500 and the exact fee is shown before confirmation.", action: "Open Wallet to follow your balance and Payouts to withdraw.", color: "text-info" },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user, isVendor } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const steps = isVendor ? vendorSteps : affiliateSteps;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!user) return;
    const timeoutId = setTimeout(() => {
      supabase.from("onboarding_progress").upsert({ user_id: user.id, role: isVendor ? "vendor" : "affiliate", current_step: currentStep, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).then(() => {});
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [currentStep, user, isVendor]);

  const handleComplete = async () => {
    if (!user) return;
    await supabase.from("onboarding_progress").upsert({ user_id: user.id, role: isVendor ? "vendor" : "affiliate", current_step: totalSteps - 1, completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    onComplete();
  };

  const handleNext = () => {
    if (currentStep === totalSteps - 1) return void handleComplete();
    setDirection(1);
    setCurrentStep((step) => step + 1);
  };

  const handlePrev = () => {
    if (currentStep === 0) return;
    setDirection(-1);
    setCurrentStep((step) => step - 1);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") onSkip();
  }, [onSkip]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    firstFocusableRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown]);

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" className="fixed inset-0 z-[100] flex items-end justify-center bg-background/85 p-2 backdrop-blur-md sm:items-center sm:p-4" onClick={(event) => { if (event.target === modalRef.current) onSkip(); }}>
      <div className="w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-2xl sm:max-h-[90vh] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quick start</p>
            <h2 id="onboarding-title" className="mt-1 font-serif text-2xl font-bold">Welcome to Mirvyn</h2>
            <p id="onboarding-description" className="mt-1 text-sm text-muted-foreground">A four-step path for {isVendor ? "selling your products" : "earning from recommendations"}.</p>
          </div>
          <Button ref={firstFocusableRef} variant="ghost" size="sm" onClick={onSkip} className="min-h-11 shrink-0 text-muted-foreground" aria-label="Skip quick start"><X className="mr-1 h-4 w-4" aria-hidden="true" />Skip</Button>
        </div>

        <div className="mt-6 space-y-2" aria-live="polite"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Step {currentStep + 1} of {totalSteps}</span><span>{Math.round(progress)}%</span></div><Progress value={progress} className="h-2" /></div>

        <div className="mt-5 min-h-[310px] overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:min-h-[330px] sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} initial={{ x: direction > 0 ? 30 : -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction > 0 ? -30 : 30, opacity: 0 }} transition={{ duration: 0.2 }} className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-sm"><StepIcon className={cn("h-8 w-8", step.color)} aria-hidden="true" /></div>
              <h3 className="mt-5 font-serif text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{step.description}</p>
              <div className="mt-5 flex w-full items-start gap-2 rounded-xl border border-primary/15 bg-card/80 p-3 text-left text-xs font-medium text-primary"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{step.action}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0} className="min-h-11" aria-label="Previous quick-start step"><ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />Back</Button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Quick-start steps">
            {steps.map((item, index) => <button key={item.title} type="button" onClick={() => { setDirection(index > currentStep ? 1 : -1); setCurrentStep(index); }} className={cn("h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", index === currentStep ? "w-7 bg-primary" : "w-2 bg-muted-foreground/30")} aria-label={`Go to step ${index + 1}`} aria-current={index === currentStep ? "step" : undefined} />)}
          </div>
          <Button onClick={handleNext} className="min-h-11" aria-label={currentStep === totalSteps - 1 ? "Finish quick start" : "Next quick-start step"}>{currentStep === totalSteps - 1 ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />Done</> : <>Next<ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></>}</Button>
        </div>
      </div>
    </div>
  );
}
