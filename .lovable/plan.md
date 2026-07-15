## Selar Competitive Analysis & Domination Blueprint — Delivery Plan

**Deliverable:** A single professionally designed PDF report (saved to `/mnt/documents/`) covering all 17 sections you listed, plus a companion Markdown source file for future edits. No code changes to the Mirvyn app itself in this task — this is a strategy artifact.

---

### Phase 1 — Selar research (external)
Using Firecrawl + web search (Reddit, X, Product Hunt, Trustpilot, YouTube transcripts, blog reviews, Selar's own help center & pricing pages), gather primary evidence on:
- Homepage, onboarding (seller / affiliate / buyer), product creation, checkout, dashboards, payouts, commissions, referral & link generation, storefronts, digital/course/event/membership products, email tools, integrations, mobile, SEO, trust signals, support, pricing.
- Sentiment corpus: what users praise, complain about, and ask for. Every claim in the report gets a source URL footnote.

### Phase 2 — Mirvyn internal audit
Index the codebase (routes, edge functions, DB tables, RLS, feature flags, dashboards, payment flows) and score each surface on: UX, mobile, conversion, security, scalability, retention, monetization. Cross-reference to Selar equivalents to produce a gap matrix.

### Phase 3 — Blueprint
Feature gap table (Mirvyn vs Selar vs Best-in-class), scored by Impact (1–10) × Effort (1–10) = Priority. Grouped into Quick Wins (1–7 days), Medium (1–2 months), Major moats (2–6 months), and Game-changers (AI matching, dynamic commissions, viral loops, gamified leaderboards, predictive analytics, marketplace intelligence).

### Phase 4 — Revenue maximization
Additional streams (premium vendor tiers, affiliate pro, marketplace ads, enterprise, data products, certification), each with revenue-impact estimate, complexity, and priority score.

### Phase 5 — PDF report
Rendered with ReportLab using Mirvyn brand tokens (Playfair Display headings, Inter body, Teal Blue / Brick Red / Teal Grey / Void Black). Includes:
- Cover, exec summary, all 17 sections, scoring tables, priority matrix, 30/90/180-day plans, appendix of sources.
- Charts (matplotlib) for gap scores, priority matrix, revenue projections.
- Selar screenshots captured via Firecrawl where they add evidence (embedded, credited).
- QA pass: render each page to JPEG, inspect for overflow/clipping/contrast/font issues, fix, re-render until clean.

### Technical notes
- Research via Firecrawl (scrape + search) and websearch tools; sub-agents spawned in parallel per surface area to keep it fast.
- Report generation script kept in `/tmp/`; only the final PDF (and a `.md` source) written to `/mnt/documents/`.
- Target length: ~40–60 pages, brutally specific, no filler.
- One clarifying assumption: I will target the **global Selar.co** product (English, NGN/USD). If you want the analysis narrowed to a specific geo (e.g. Nigeria only) or vertical (courses only, digital downloads only), tell me before I start and I'll scope accordingly — otherwise I proceed with the full platform.

Approve this and I'll execute end-to-end and hand you the PDF.