-- supabase/migrations/0004_phase4_parent_links_invoice_id.sql
-- Additive: add invoice_id to parent_links so a report link can optionally
-- reference a specific invoice for the billing section.
-- The invoices table already exists in production.

ALTER TABLE public.parent_links
  ADD COLUMN IF NOT EXISTS invoice_id TEXT DEFAULT NULL;
