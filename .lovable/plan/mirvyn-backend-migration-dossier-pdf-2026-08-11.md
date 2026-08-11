# Mirvyn Backend Migration Dossier (PDF)

Produce a single, exhaustive PDF that documents the entire current backend so an external AI coding agent can detach Mirvyn from Lovable Cloud and stand it up on a self-hosted Supabase instance — including moving the existing live data.

## What the PDF will contain

**1. Executive overview**
- What the backend is (Postgres + Auth + Storage + 15 edge functions + cron), what is Lovable-specific and must be replaced, what is portable as-is.
- Migration risk register and recommended order of operations.

**2. Complete database reference**
- All 34 tables: every column with type, nullability, default, and plain-English purpose.
- All 6 enum types with values.
- Every primary key, foreign key, unique constraint, and index.
- All 44 database functions with full source and what each one does.
- All 73 triggers: table, timing, event, function.
- Every RLS policy per table (command, roles, USING/WITH CHECK expression) plus GRANT matrix per role.
- pg_cron jobs and their schedules/payloads.

**3. One-file bootstrap SQL**
- A single ordered `schema.sql` (extensions → enums → tables → grants → RLS → policies → functions → triggers → cron) that recreates the backend from empty on self-hosted Supabase, with the Lovable-specific bits called out.

**4. Data migration runbook (existing data)**
- Export order and FK-safe restore sequence for all tables.
- `auth.users` migration: preserving user IDs so `profiles`, `wallets`, `user_roles`, `sales`, and `affiliate_links` keep pointing at the right accounts; password hash handling; what breaks if IDs change.
- Storage bucket (`avatars`) file migration and re-pointing `avatar_url`.
- Trigger-disable/re-enable strategy so restore doesn't fire notification/logging triggers.
- Post-import verification queries (row counts, wallet balance reconciliation, orphan-FK checks).

**5. Edge functions reference**
For each of the 15 functions: purpose, invocation path (client / webhook / cron), `verify_jwt` setting, request/response shape, secrets used, tables written, and side effects. Grouped by domain: payments (initialize-payment, paystack-callback, paystack-webhook, process-sale, process-refund, cleanup-stale-payments), money movement (process-payouts, clear-earnings), AI (ai-insights, ai-autonomous-scheduler, generate-daily-digest, fraud-detection), delivery/misc (get-delivery, track-click, send-email), plus `_shared`.

**6. Frontend ↔ backend wiring**
- Every client integration point: the generated Supabase client, env vars, the 53 files that touch the DB, the 11 `functions.invoke` call sites, storage usage, realtime subscriptions.
- Exactly which files must change (`.env`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`) and how to regenerate types against the new instance.

**7. Money & business logic spec**
- The full monetary model as implemented (listing fees, onboarding fees, affiliate membership, 10%/15% platform fee, 2%/3% withdrawal fees, ₦2,500 minimum, earning states pending → cleared → withdrawable, payout hold and fund reservation) so nothing is lost in translation.
- Payment verification architecture: pending payment record → reference → Paystack → signature-verified webhook → idempotent amount check → activation.

**8. Secrets & configuration matrix**
- Every secret the backend reads, what it is for, and where the self-hosted replacement value comes from.
- Lovable-only dependencies and their replacements: `LOVABLE_API_KEY` / Lovable AI Gateway, auto-generated client and types, `supabase/config.toml` handling, auth settings (providers, email confirmation, HIBP), self-hosted Auth/Storage/pg_cron/pg_net enablement.

**9. AI gateway swap (provider-agnostic)**
- Exact locations of every gateway call, the request/response shape used, and the minimal diff to point them at any OpenAI-compatible endpoint (base URL, auth header, model id) — written so DeepSeek, OpenAI, Gemini, or a local model can be dropped in.
- Feature-flag path to keep AI surfaces dark during the cutover.

**10. Cutover checklist & verification plan**
- Step-by-step sequence, DNS/URL and Paystack webhook re-pointing, smoke tests per flow (signup, referral capture, listing payment, checkout, delivery, withdrawal, admin approval), rollback plan.

**11. Appendices**
- Migration file inventory (39 files) and which are superseded.
- Known warnings carried over (function `search_path`, public `avatars` bucket listing, SECURITY DEFINER execute grants) with fixes.

## Technical approach

Read the live schema, policies, grants, indexes, function bodies, trigger definitions, and cron jobs directly from the database; read all edge function sources and the client call sites from the repo. Generate the PDF with a Python/ReportLab script into `/mnt/documents/`, then render every page to an image and inspect each one for clipped tables, overflowing code blocks, and broken layout before delivering. Also emit the bootstrap `schema.sql` as a companion file so it can be applied verbatim.

No application code is modified — this is documentation only.
