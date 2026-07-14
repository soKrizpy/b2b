-- =============================================================
-- MIGRATION 7 — Restore learning_paths table
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Migration 6 dropped learning_paths but the entire frontend
-- (admin.js + student.js) still depends on it. This restores
-- the table with the exact schema the app expects.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_name   text        NOT NULL,
  resource_url  text,
  homework_text text,
  homework_done boolean     NOT NULL DEFAULT false,
  is_completed  boolean     NOT NULL DEFAULT false,
  order_index   int         NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-student lookups
CREATE INDEX IF NOT EXISTS learning_paths_student_id_idx
  ON public.learning_paths(student_id);

-- Keep updated_at current automatically
DROP TRIGGER IF EXISTS set_learning_paths_updated_at ON public.learning_paths;
CREATE TRIGGER set_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

-- Drop old policies cleanly before recreating
DROP POLICY IF EXISTS "learning_paths_select_own"   ON public.learning_paths;
DROP POLICY IF EXISTS "learning_paths_admin_all"     ON public.learning_paths;

-- Students can read only their own rows
CREATE POLICY "learning_paths_select_own"
  ON public.learning_paths FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

-- Admins have full write access
CREATE POLICY "learning_paths_admin_all"
  ON public.learning_paths FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Grant access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Done ✓
