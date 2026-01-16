import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, Package, Link2, Wallet } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up",
    description: "Create your free account as a vendor or affiliate in under a minute.",
    step: "01",
  },
  {
    icon: Package,
    title: "Add Products",
    description: "Upload your digital files or add external course links with custom pricing.",
    step: "02",
  },
  {
    icon: Link2,
    title: "Share Links",
    description: "Generate affiliate links and start promoting to your audience.",
    step: "03",
  },
  {
    icon: Wallet,
    title: "Get Paid",
    description: "Earn commissions on every sale and withdraw to your bank account.",
    step: "04",
  },
];

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section ref={containerRef} className="py-24 bg-muted/30">
      <div className="container">
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
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4"
          >
            How It Works
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold font-serif mb-6">
            Start Earning in{" "}
            <span className="text-gradient-accent">Four Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get from signup to your first sale in minutes, not days.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary -translate-y-1/2 opacity-20" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="relative p-8 rounded-2xl bg-card border border-border text-center group hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  {/* Step Number */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.3, type: "spring" }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center"
                  >
                    <span className="text-sm font-bold text-white">{step.step}</span>
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex p-4 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors"
                  >
                    <step.icon className="h-8 w-8 text-primary" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold font-serif mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
