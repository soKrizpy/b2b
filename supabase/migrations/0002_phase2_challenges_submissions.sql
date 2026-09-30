-- supabase/migrations/0002_phase2_challenges_submissions.sql
-- Phase 2 additive migration — Challenges & Submissions system.
-- ALL statements are idempotent (IF NOT EXISTS / DO $$ guards).
-- NEVER drops or alters existing columns.
-- Safe to re-run against the production database.

-- ── 1. challenges ─────────────────────────────────────────────────────────────
-- Challenges belong to a topic and describe a task the student must complete.
-- Students prove completion by submitting a URL link or uploaded file.

CREATE TABLE IF NOT EXISTS public.challenges (
  id                 serial       PRIMARY KEY,
  topic_id           integer      NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title              text         NOT NULL,
  instructions       text,
  order_index        integer      NOT NULL DEFAULT 0,
  allows_file_upload boolean      NOT NULL DEFAULT false,
  created_at         timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS challenges_topic_id_idx
  ON public.challenges (topic_id, order_index ASC);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'challenges'
    AND policyname = 'challenges_service_role_all'
  ) THEN
    CREATE POLICY challenges_service_role_all
      ON public.challenges TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ── 2. challenge_submissions ──────────────────────────────────────────────────
-- One row per student per submission attempt.
-- Students may resubmit after a 'needs_revision' status.
-- status: 'pending' → teacher reviews → 'approved' or 'needs_revision'

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id               serial       PRIMARY KEY,
  challenge_id     integer      NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_url   text,                   -- URL proof or uploaded file URL
  submission_note  text,                   -- optional note from student
  status           text         NOT NULL DEFAULT 'pending'
                   CONSTRAINT challenge_submissions_status_check
                   CHECK (status IN ('pending', 'approved', 'needs_revision')),
  review_note      text,                   -- teacher feedback
  reviewed_by      uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  submitted_at     timestamptz  NOT NULL DEFAULT now(),
  created_at       timestamptz  NOT NULL DEFAULT now()
);

-- Fast lookup: pending submissions for a teacher (joins via student_modules / meetings)
CREATE INDEX IF NOT EXISTS challenge_submissions_student_id_idx
  ON public.challenge_submissions (student_id);

CREATE INDEX IF NOT EXISTS challenge_submissions_challenge_id_idx
  ON public.challenge_submissions (challenge_id);

CREATE INDEX IF NOT EXISTS challenge_submissions_status_idx
  ON public.challenge_submissions (status)
  WHERE status = 'pending';

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'challenge_submissions'
    AND policyname = 'challenge_submissions_service_role_all'
  ) THEN
    CREATE POLICY challenge_submissions_service_role_all
      ON public.challenge_submissions TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Students can read and insert their own submissions via the anon client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'challenge_submissions'
    AND policyname = 'challenge_submissions_student_select'
  ) THEN
    CREATE POLICY challenge_submissions_student_select
      ON public.challenge_submissions FOR SELECT
      USING (student_id = auth.uid());
  END IF;
END$$;

-- ── End of Phase 2 migration ──────────────────────────────────────────────────
