-- Repair found by live attack testing: create_verified_sale inserts with
-- `ON CONFLICT (payment_reference) DO NOTHING`, but the only existing index
-- was PARTIAL (`WHERE payment_reference IS NOT NULL`). Postgres cannot infer
-- a partial index as a conflict target, so every sale insert raised
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" on any database matching the repo schema.
--
-- A FULL unique index has identical semantics here (unique indexes treat
-- NULLs as distinct, so multiple NULL payment_references remain legal) and
-- gives ON CONFLICT a valid inference target.
DROP INDEX IF EXISTS public.sales_payment_reference_unique;
CREATE UNIQUE INDEX IF NOT EXISTS sales_payment_reference_unique
  ON public.sales (payment_reference);
