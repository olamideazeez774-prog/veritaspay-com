import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2, WalletCards } from "lucide-react";

const vendorPricing = [
  ["FREE", "vendor registration"],
  ["₦2,000", "one-time listing fee per product"],
  ["5%", "MIRVYN platform fee on each successful sale"],
];

const affiliatePricing = [
  ["₦350/month", "affiliate access"],
  ["₦3,500", "minimum withdrawal"],
];

function PricingItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm leading-6 text-muted-foreground">
        <span className="font-semibold text-foreground">{value}</span>, {label}
      </p>
    </div>
  );
}

export function PricingSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section ref={containerRef} className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
        >
          <h2 className="font-serif text-3xl font-bold sm:text-4xl md:text-5xl">Simple, transparent pricing.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">No complicated plans. No hidden MIRVYN transaction charges.</p>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, x: -24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-primary/20 bg-card p-6 shadow-sm sm:p-8"
          >
            <h3 className="font-serif text-2xl font-semibold">Vendors</h3>
            <div className="mt-6 space-y-4">
              {vendorPricing.map(([value, label]) => <PricingItem key={label} value={value} label={label} />)}
            </div>
            <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
              Payment processing fees are handled separately. Vendors can choose whether the customer, vendor, or both share the cost.
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="rounded-3xl border border-accent/20 bg-card p-6 shadow-sm sm:p-8"
          >
            <h3 className="font-serif text-2xl font-semibold">Affiliates</h3>
            <div className="mt-6 space-y-4">
              {affiliatePricing.map(([value, label]) => <PricingItem key={label} value={value} label={label} />)}
            </div>
            <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
              Track your sales and commissions in real time. Withdraw once you reach the minimum withdrawal amount.
            </p>
          </motion.article>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-4 rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <WalletCards className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-semibold">Withdrawal fee</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  A withdrawal fee of ₦50 to ₦500 applies to all payouts, based on amount, and never exceeds ₦500. This applies to both vendors and affiliates.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <Link to="/pricing" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary transition-colors hover:text-primary/80">
            View full pricing → <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
