import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PLATFORM_NAME } from "@/lib/constants";
import { Shield, TrendingUp, Users, Zap } from "lucide-react";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

export default function About() {
  const features = [
    {
      icon: Shield,
      title: "Secure & Trusted",
      description:
        "Built with enterprise-grade security. Your earnings and data are protected with bank-level encryption.",
    },
    {
      icon: TrendingUp,
      title: "High Commissions",
      description:
        "Earn competitive commissions on every sale. Our vendors offer some of the best rates in the industry.",
    },
    {
      icon: Users,
      title: "Growing Community",
      description:
        "Join thousands of vendors and affiliates already earning on our platform.",
    },
    {
      icon: Zap,
      title: "Instant Payouts",
      description:
        "Get paid quickly. Our streamlined payout system ensures you receive your earnings fast.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mx-auto max-w-3xl text-center"
            >
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                About{" "}
                <span className="text-gradient-primary">{PLATFORM_NAME}</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                {PLATFORM_NAME} is a premium digital marketplace connecting vendors with affiliates
                to sell and promote high-quality digital products.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="mx-auto max-w-4xl"
            >
              <motion.h2
                variants={staggerItem}
                className="font-serif text-3xl font-bold text-center mb-8"
              >
                Our Mission
              </motion.h2>
              <motion.p
                variants={staggerItem}
                className="text-lg text-muted-foreground text-center"
              >
                We believe in empowering creators and marketers alike. Our platform provides the
                tools, transparency, and support needed for both vendors to scale their digital
                product businesses and affiliates to build sustainable income streams.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={staggerItem}
                  className="glass-card p-6 text-center hover-lift"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join {PLATFORM_NAME} today and start your journey as a vendor or affiliate.
              </p>
              <a
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                Create Account
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
