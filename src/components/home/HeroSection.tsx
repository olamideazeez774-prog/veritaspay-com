import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/constants";
import { ArrowRight, Play, Sparkles, Store, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden pt-24 sm:min-h-[720px] sm:pt-28">
      <div className="absolute inset-0 gradient-mesh" />
      <motion.div animate={{ y: [0, -16, 0], rotate: [0, 4, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute left-[8%] top-1/4 h-16 w-16 rounded-2xl gradient-primary opacity-20 blur-sm sm:h-24 sm:w-24" />
      <motion.div animate={{ y: [0, 18, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="pointer-events-none absolute right-[10%] top-1/3 h-24 w-24 rounded-full gradient-accent opacity-10 blur-md sm:h-40 sm:w-40" />

      <div className="container relative z-10 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm sm:mb-7 sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />{PLATFORM_TAGLINE}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Create. Sell. Grow.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }} className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            MIRVYN gives creators a simple platform to sell digital products, manage their business, and connect with customers and promoters.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }} className="mt-8 grid gap-3 sm:flex sm:justify-center">
            <Button asChild size="lg" className="min-h-12 gap-2 px-6 text-base"><Link to="/register"><Store className="h-4 w-4" />Start selling now <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="min-h-12 gap-2 bg-card/60 px-6 text-base"><Link to="/marketplace"><Users className="h-4 w-4" />Explore the marketplace</Link></Button>
          </motion.div>

          <motion.a href="#how-it-works" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Play className="h-4 w-4" aria-hidden="true" />See how it works
          </motion.a>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.6 }} className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-left shadow-sm backdrop-blur-sm sm:mt-14 sm:gap-4 sm:p-4">
            {[
              ["Free", "vendor registration"],
              ["₦2,000", "product listing"],
              ["₦350/mo", "affiliate access"],
            ].map(([value, label]) => (
              <div key={label} className="min-w-0 rounded-xl px-2 py-2 sm:px-3">
                <p className="truncate font-serif text-lg font-bold text-primary sm:text-2xl">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
