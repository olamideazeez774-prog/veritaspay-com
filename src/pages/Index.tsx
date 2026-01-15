import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Users, ShoppingBag, TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-gradient-primary">
            {PLATFORM_NAME}
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero py-24">
        <div className="container text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            <span className="text-gradient-primary">{PLATFORM_NAME}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            {PLATFORM_TAGLINE}. Sell digital products, recruit affiliates, and scale your revenue with complete transparency.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Start Selling <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">Why Choose {PLATFORM_NAME}?</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShoppingBag, title: "Sell Digital Products", description: "Upload files or link to courses. Instant delivery to buyers." },
              { icon: Users, title: "Recruit Affiliates", description: "Let marketers promote your products with tracked referral links." },
              { icon: TrendingUp, title: "Real-Time Tracking", description: "Every click, conversion, and sale tracked instantly." },
              { icon: Shield, title: "Secure Payments", description: "Paystack integration for local and international cards." },
              { icon: BarChart3, title: "Detailed Analytics", description: "Know exactly what's working with comprehensive dashboards." },
              { icon: Zap, title: "Instant Payouts", description: "Clear earnings move to withdrawable balance automatically." },
            ].map((feature, i) => (
              <div key={i} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to grow your business?</h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Join thousands of vendors and affiliates earning on {PLATFORM_NAME}.
          </p>
          <Link to="/register">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {PLATFORM_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
