# Mirvyn — Pre-Launch Audit + Roadmap v2 PDF

Two independent workstreams. I'll do the audit first (touches code), then regenerate the PDF (touches only `/mnt/documents`).

---

## Part 1 — Codebase audit & hardening

Goal: no reachable security or logic issue. Zero client-side feature activation. Every paid feature gated on webhook-verified `pending_payments.status = 'verified'`.

### 1.1 Static + security sweep
- Run `security--run_security_scan` and `supabase--linter` in parallel.
- `rg` sweeps for known anti-patterns:
  - client-side "activate on success" writes (`.update({... status: 'active'`, `is_verified: true`, `vendor_tier: 'premium'`) originating outside edge functions.
  - direct `supabase.from('profiles').update` on privileged columns from client.
  - any remaining `payment_success = true` short-circuits in `PaymentCallback`, `RoleSelector`, `SettingsPage`, `ProductForm`.
  - `.single()` vs `.maybeSingle()` on external lookups.
  - `verify_jwt` mismatches vs `config.toml`.
  - `console.log` of secrets, `service_role` usage in client bundle.
- Check every edge function for: CORS on all responses (including errors), input validation, idempotency guard on webhook, amount verification against `expected_amount`.

### 1.2 Payment flow airtightness (per user's rule #19)
Verify each paid surface routes through:
`initialize-payment` → `pending_payments (pending)` → Paystack → `paystack-webhook` → `verify-payment` shared → activate feature + audit log + notification.

Surfaces to re-verify end-to-end:
- Vendor onboarding (both A ₦8,500 and B ₦3,000 + 5-sale deduction — the B model is new; flag as roadmap-only, not blocking).
- Affiliate membership.
- Product listing fee.
- Verification badge.
- Sales checkout.
- Any premium upgrade path.

Idempotency check: webhook re-delivery must be a no-op. Confirm `verified_at IS NOT NULL` short-circuit exists in `paystack-webhook` and `verify-payment`.

### 1.3 Feature-flag "does not exist" enforcement
Sweep for any flagged feature still rendering when flag is off:
- Sidebar/nav items, dashboard cards, admin nav, route registrations, mobile bottom nav.
- Confirm `<FeatureGate>` / `<FeatureFlagRoute>` wraps every flagged surface. Add missing ones.

### 1.4 RLS + GRANT audit
- Confirm `pending_payments`, `product_listing_payments`, `verification_requests`, `user_roles`, `profiles.admin_notes` policies match intent.
- Ensure `service_role` GRANT exists on every table the edge functions touch.

### 1.5 UX / button audit
Playwright pass (headless) across:
- `/` → CTA buttons render, no console errors.
- `/register`, `/login` (unauth) → forms submit-ready.
- Marketplace → product cards clickable, checkout modal opens.
- Dashboard (authenticated via injected session) → sidebar links resolve, no 404, no unhandled promise rejections in console.
- Admin routes at `/vp-admin-x7k9` → guarded.

Any issue found gets fixed in the same turn, minimal blast radius, then re-verified.

### 1.6 Deliverable
Short written report: what was scanned, what was found, what was fixed, what remains (with severity). No hand-wave "looks good" — every claim tied to a file/line or a passed check.

---

## Part 2 — Roadmap PDF v2 (fully integrated rewrite)

**Not an appendix.** The existing 25-page blueprint is rewritten so the 19 architectural updates read as if they were in the original vision.

### 2.1 Structural changes to the document

Old section → new treatment:

| Old | New |
|---|---|
| "Selar vs Mirvyn" framing dominant | Repositioned: Mirvyn = **Africa's Growth Network**. Selar comparison becomes one chapter, not the spine. |
| 4 strategic pillars (varied) | **5 pillars: Community · Distribution · Trust · Intelligence · Depth** — every feature mapped to a pillar. |
| Monetary tables (old fees) | Rewritten with: affiliate membership ~₦350/mo (₦4,000/yr), vendor onboarding A/B, listing standard vs waiver (15%), withdrawal 3%/2%, Paystack Transfers auto-payout, monthly PDF/CSV statements. |
| "Marketplace of affiliates" | Renamed **Mirvyn Elite Network** (a.k.a. Verified Affiliate Network) — with full profile schema, vendor discovery flow. |
| Campaigns section | Rewritten around **Campaign Escrow** + **Campaign Bonus Engine** (tiered cycle rewards). |
| Retention section | Rewritten around **Social Network feed**, **Vendor Communities**, **Follow System**, **Live Events**, **Weekly Challenges**. |
| Trust section | Rewritten around **Mirvyn Score** (public reputation), verification tiers. |
| AI section | Split into **Discovery Engine**, **AI Business Coach**, **Content Studio**, **Product Intelligence**. |
| Payment architecture blurb | Promoted to a full **Payment Verification Architecture** chapter enforcing pending → webhook → verify → activate. Diagram included. |
| Roadmap timeline | Rewritten 30/90/180/365 with the new features slotted into the correct phase. |

New required visuals:
- **Network-effect flywheel diagram** (matplotlib, circular flow).
- **Payment verification sequence diagram** (matplotlib/reportlab shapes).
- **Pillar map** (5 pillars → features table).
- **Monetary logic table** (single canonical source of truth).
- **Elite Network profile schema** (mock profile card rendered).

### 2.2 Generation approach
- Rewrite the ReportLab script (`/tmp/mirvyn_roadmap_v2.py`), not patch the old one — cleaner than surgical edits across 25 pages.
- Brand tokens preserved: Playfair Display headings, Inter body, Teal Blue / Brick Red / Teal Grey / Void Black.
- Register DejaVu Sans for any ₦ / accented content so glyphs render.
- Output → `/mnt/documents/Mirvyn_Roadmap_v2.pdf` (leave v1 in place).

### 2.3 QA (mandatory per skill/pdf)
- `pdftoppm` every page to JPEG at 150 dpi.
- View each page image, hunt for: overflow, clipped tables, black-box glyphs (₦, subscripts), overlapping shapes on the flywheel/sequence diagrams, wrong section ordering.
- Iterate until a full pass finds nothing new.
- Deliver with `<presentation-artifact>` tag + a short summary of what was checked.

---

## Order of operations
1. Kick off Part 1 (audit) — parallel scans + rg sweeps first, then targeted fixes.
2. In the same session, once fixes are stable, run Part 2 (PDF rewrite + QA).
3. Final message: audit summary + artifact tag for the new PDF.

## Out of scope
- Actually building any of the roadmap features (Social feed, Elite Network, Escrow, etc.). Those are documented, not implemented.
- Migrating existing fee data (₦2,000/6mo → ₦4,000/yr) — no live subscribers yet per prior context; flag as a data migration to run at cutover if needed.
- Any change to `src/integrations/supabase/client.ts`, `types.ts`, or `.env` (auto-generated).
