-- supabase/migrations/0001_phase1_additive.sql
-- Phase 1 additive migration for b2b-lms-rebuild.
-- ALL statements use IF NOT EXISTS / IF EXISTS guards.
-- NEVER drops or alters existing columns.
-- Safe to re-run against the production database.

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: The production Supabase project already has the following tables which
-- this migration does NOT touch:
--   modules, topics, students, topic_progress, student_modules,
--   engine_progress, student_pets, student_badges, parent_links,
--   quizzes, quiz_questions, quiz_attempts, post_class_quiz_attempts,
--   module_assessments, module_assessment_questions, module_assessment_attempts,
--   meetings, meeting_students
--
-- Phase 1 requires no new tables — meetings and meeting_students already exist.
-- This migration only adds missing indexes and ensures the profiles table exists
-- (for role resolution via public.profiles.role).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Ensure public.profiles exists ─────────────────────────────────────────
-- The rebuild reads role from public.profiles.  If the table was named
-- differently in older deployments, update the column reference in
-- src/features/auth/lib/resolveRole.ts instead of running this block.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile (needed for role resolution via anon client).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_select'
  ) THEN
    CREATE POLICY profiles_self_select ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END$$;

-- ── 2. meetings — ensure recommended indexes exist ────────────────────────────
-- These speed up the per-student and per-teacher dashboard queries.
-- The meetings table already exists; we only add indexes safely.

CREATE INDEX IF NOT EXISTS meetings_meeting_date_idx
  ON public.meetings (meeting_date ASC);

CREATE INDEX IF NOT EXISTS meeting_students_student_id_idx
  ON public.meeting_students (student_id);

-- ── 3. parent_links — ensure token lookup index exists ───────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS parent_links_token_idx
  ON public.parent_links (token);

-- ── End of Phase 1 migration ─────────────────────────────────────────────────
