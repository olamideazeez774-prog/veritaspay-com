import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/constants";

type InfoPageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
  cta?: { label: string; href: string };
};

const pages: Record<string, InfoPageContent> = {
  "/pricing": {
    eyebrow: "Simple, transparent pricing",
    title: "Choose the way you want to grow",
    intro: "Transparent pricing for creators, vendors, and affiliates. No vendor registration fee and no hidden transaction charges.",
    sections: [
      { heading: "Free vendor registration", body: "Create a vendor account at no cost. Each course has a fixed one-time ₦2,000 listing fee." },
      { heading: "5% platform commission", body: "Mirvyn earns 5% on every successful sale. The platform commission is shown clearly in the sale economics." },
      { heading: "Affiliate membership", body: "Affiliate access is ₦350 per month. Affiliates can promote products, track performance, and earn commissions." },
      { heading: "Withdrawals", body: "The minimum withdrawal is ₦3,500. A withdrawal fee of ₦50–₦500 applies to all payouts, based on amount, and never exceeds ₦500. This applies to both vendors and affiliates." },
    ],
    cta: { label: "Start selling now", href: "/register?role=vendor" },
  },
  "/blog": {
    eyebrow: "Mirvyn insights",
    title: "Learn, launch, and grow",
    intro: "Our editorial hub is being prepared with practical guidance for digital-product vendors and affiliate marketers.",
    sections: [
      { heading: "What you will find here", body: "Expect playbooks on product positioning, ethical promotion, conversion tracking, customer experience, and sustainable growth." },
      { heading: "Until launch", body: "Explore the marketplace and use the dashboard toolkit to start building your operating rhythm today." },
    ],
    cta: { label: "Browse the marketplace", href: "/marketplace" },
  },
  "/careers": {
    eyebrow: "Build with us",
    title: "Careers at Mirvyn",
    intro: "We are building a more transparent way for creators and marketers to earn from digital products.",
    sections: [
      { heading: "Our values", body: "We value clarity, customer empathy, responsible experimentation, and reliable execution." },
      { heading: "Open conversations", body: "For partnership or future team opportunities, contact us and tell us what you would like to build." },
    ],
    cta: { label: "Contact Mirvyn", href: "/contact" },
  },
  "/contact": {
    eyebrow: "We are here to help",
    title: "Contact Mirvyn",
    intro: "Tell us what you need help with and our support team will route your request to the right person.",
    sections: [
      { heading: "Support", body: "For account, product, payment, or delivery questions, include the email on your Mirvyn account and a clear description of the issue." },
      { heading: "Email", body: "Reach the team at mirvynsupport@gmail.com. We aim to respond with a useful next step rather than a generic acknowledgement." },
    ],
    cta: { label: "Email support", href: "mailto:mirvynsupport@gmail.com" },
  },
  "/terms": {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro: "These terms describe the rules for using Mirvyn as a vendor, affiliate, buyer, or administrator.",
    sections: [
      { heading: "Responsible use", body: "Use accurate account information, respect intellectual property, and do not misuse payment, tracking, or messaging features." },
      { heading: "Transactions", body: "Prices, commissions, platform fees, delivery obligations, and refund terms are shown in the relevant product or dashboard flow before action is taken." },
      { heading: "Account protection", body: "Keep credentials private and contact support promptly if you suspect unauthorized access or a suspicious transaction." },
    ],
  },
  "/privacy": {
    eyebrow: "Legal",
    title: "Privacy Policy",
    intro: "Mirvyn uses account, transaction, and product data to provide marketplace, affiliate, delivery, analytics, and support features.",
    sections: [
      { heading: "Data we use", body: "We use information you provide, operational events, and payment references needed to authenticate users, deliver products, attribute affiliate sales, and prevent fraud." },
      { heading: "Your choices", body: "You can review profile information in Settings and contact support about access, correction, or account questions." },
      { heading: "Security", body: "Access to sensitive operations is controlled by authenticated sessions, role checks, database policies, and server-side functions." },
    ],
  },
  "/cookies": {
    eyebrow: "Legal",
    title: "Cookie Policy",
    intro: "Mirvyn uses essential browser storage and cookies to keep sessions, preferences, and secure application flows working.",
    sections: [
      { heading: "Essential storage", body: "Authentication sessions, checkout context, theme preferences, and rate-limit state may be stored locally so the application can function." },
      { heading: "Optional technologies", body: "Where analytics or embedded media are enabled, the relevant provider may set additional technologies subject to its own policy." },
    ],
  },
  "/refunds": {
    eyebrow: "Legal",
    title: "Refund Policy",
    intro: "Refund eligibility is shown on each product and depends on the product's stated refund window and delivery status.",
    sections: [
      { heading: "Requesting a refund", body: "Use the purchase details associated with the transaction and contact support before the displayed refund window expires." },
      { heading: "Review", body: "Mirvyn may review delivery records, product access, and the applicable vendor policy before confirming a refund." },
      { heading: "Vendor responsibility", body: "Vendors are responsible for accurate product descriptions, delivery information, and timely support for their buyers." },
    ],
  },
};

export default function InfoPage() {
  const { pathname } = useLocation();
  const page = pages[pathname] ?? pages["/about"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="container max-w-5xl">
          <section className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{page.eyebrow}</p>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{page.intro}</p>
          </section>
          <section className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            {page.sections.map((section) => (
              <article key={section.heading} className="glass-card p-6 sm:p-8">
                <CheckCircle2 className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="font-serif text-xl font-semibold">{section.heading}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </section>
          {page.cta && (
            <div className="mt-12 flex justify-center">
              {page.cta.href.startsWith("mailto:") ? (
                <Button asChild size="lg" className="gap-2">
                  <a href={page.cta.href}>
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {page.cta.label}
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" className="gap-2">
                  <Link to={page.cta.href}>
                    {page.cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          )}
          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
            This page is part of {PLATFORM_NAME}'s public information center. For account-specific help, sign in and contact support with your transaction details.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
