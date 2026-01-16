import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PLATFORM_NAME } from "@/lib/constants";
import {
  ShoppingBag,
  Users,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Globe,
  CreditCard,
} from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Digital Products",
    description: "Upload files or link to courses. Instant delivery with secure downloads.",
    color: "from-teal-500 to-teal-600",
  },
  {
    icon: Users,
    title: "Affiliate Network",
    description: "Let marketers promote your products with tracked referral links.",
    color: "from-brick-500 to-brick-600",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Tracking",
    description: "Every click, conversion, and sale tracked with millisecond precision.",
    color: "from-teal-400 to-teal-500",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Paystack integration for local and international transactions.",
    color: "from-brick-400 to-brick-500",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Know exactly what's working with comprehensive performance insights.",
    color: "from-teal-600 to-teal-700",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Cleared earnings move to withdrawable balance automatically.",
    color: "from-brick-600 to-brick-700",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Accept payments from anywhere with multi-currency support.",
    color: "from-teal-500 to-teal-600",
  },
  {
    icon: CreditCard,
    title: "Flexible Commissions",
    description: "Set your own commission rates with complete control.",
    color: "from-brick-500 to-brick-600",
  },
];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section ref={containerRef} className="py-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      <div className="container relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            Features
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold font-serif mb-6">
            Why Choose{" "}
            <span className="text-gradient-primary">{PLATFORM_NAME}</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to run a successful digital product business with 
            affiliate marketing at its core.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-semibold font-serif mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
