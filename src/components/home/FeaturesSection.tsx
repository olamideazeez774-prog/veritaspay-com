import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { PLATFORM_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Users, TrendingUp, Shield, Zap, BarChart3, Globe, CreditCard, Store } from "lucide-react";

const features = [
  { icon: ShoppingBag, title: "Digital products", description: "Sell courses, ebooks, templates, and other digital products with secure delivery.", color: "from-teal-500 to-teal-600" },
  { icon: Users, title: "Affiliate network", description: "Let trusted marketers promote your products with transparent tracked links.", color: "from-brick-500 to-brick-600" },
  { icon: TrendingUp, title: "Real-time tracking", description: "See clicks, conversions, sales, and earnings without guessing what worked.", color: "from-teal-400 to-teal-500" },
  { icon: Shield, title: "Secure payments", description: "A verified Paystack payment flow protects buyers, vendors, and affiliates.", color: "from-brick-400 to-brick-500" },
  { icon: BarChart3, title: "Clear analytics", description: "Know which products, links, and campaigns deserve your next move.", color: "from-teal-600 to-teal-700" },
  { icon: Zap, title: "Wallet and payouts", description: "Follow earnings from pending to withdrawable and request a payout with confidence.", color: "from-brick-600 to-brick-700" },
];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section ref={containerRef} className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <div className="container relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">Start with your goal</span>
          <h2 className="font-serif text-3xl font-bold sm:text-4xl md:text-5xl">One platform, two clear ways to grow</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">You do not need to understand the whole platform before you begin. Choose the path that fits what you want to do today.</p>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.article initial={{ opacity: 0, x: -24 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="group rounded-3xl border border-primary/20 bg-card p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Store className="h-6 w-6" aria-hidden="true" /></div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">For creators and vendors</span>
            </div>
            <h3 className="mt-6 font-serif text-2xl font-semibold">Sell what you know</h3>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Register free, list your digital products for a fixed ₦2,000 per course, and use Mirvyn’s affiliate network to reach more buyers.</p>
            <Button asChild className="mt-6 min-h-11 gap-2"><Link to="/register">Start selling free <ArrowRight className="h-4 w-4" /></Link></Button>
          </motion.article>

          <motion.article initial={{ opacity: 0, x: 24 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.18 }} className="group rounded-3xl border border-accent/20 bg-card p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Users className="h-6 w-6" aria-hidden="true" /></div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">For affiliates and promoters</span>
            </div>
            <h3 className="mt-6 font-serif text-2xl font-semibold">Promote products you believe in</h3>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Explore products, create tracked links, and build income from recommendations your audience already trusts.</p>
            <Button asChild variant="outline" className="mt-6 min-h-11 gap-2"><Link to="/marketplace">Explore the marketplace <ArrowRight className="h-4 w-4" /></Link></Button>
          </motion.article>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: 0.25 + index * 0.06 }} className="rounded-2xl border border-border bg-card/80 p-5 transition-colors hover:border-primary/30 sm:p-6">
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3`}><feature.icon className="h-5 w-5 text-white" aria-hidden="true" /></div>
              <h3 className="font-serif text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">{PLATFORM_NAME} keeps the next step visible so you can move from interest to action without needing someone to guide you.</p>
      </div>
    </section>
  );
}
