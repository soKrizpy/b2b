-- supabase/migrations/0007_add_teacher_id_to_meetings.sql
-- Adds teacher_id (uuid, nullable FK → profiles.id) to the meetings table.
-- Nullable so existing rows remain valid without needing a default.
-- Safe to re-run: uses IF NOT EXISTS / ALTER COLUMN guards.

-- ── 1. Add the column (no-op if already present) ─────────────────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 2. Index for the teacher dashboard query  ─────────────────────────────────
CREATE INDEX IF NOT EXISTS meetings_teacher_id_idx
  ON public.meetings (teacher_id)
  WHERE teacher_id IS NOT NULL;

-- ── 3. Allow teachers to read their own meetings via RLS ──────────────────────
-- The admin client bypasses RLS entirely, but we add a policy so the
-- cookie (server) client also works when we switch back to it later.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'meetings'
      AND policyname = 'meetings_teacher_select_own'
  ) THEN
    CREATE POLICY meetings_teacher_select_own ON public.meetings
      FOR SELECT
      USING (teacher_id = auth.uid());
  END IF;
END$$;
