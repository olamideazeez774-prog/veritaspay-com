export const PUBLIC_INFO_ROUTES = [
  "/pricing",
  "/blog",
  "/careers",
  "/contact",
  "/terms",
  "/privacy",
  "/cookies",
  "/refunds",
] as const;

export const FOOTER_LINKS = {
  product: [
    { label: "Marketplace", href: "/marketplace" },
    { label: "For Vendors", href: "/register?role=vendor" },
    { label: "For Affiliates", href: "/register?role=affiliate" },
    { label: "Pricing", href: "/pricing" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Refund Policy", href: "/refunds" },
  ],
} as const;
