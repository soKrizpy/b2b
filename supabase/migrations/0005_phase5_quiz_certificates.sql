-- supabase/migrations/0005_phase5_quiz_certificates.sql
-- Additive only. All statements use IF NOT EXISTS guards.

-- ── 1. topic_quiz_attempts ─────────────────────────────────────────────────
-- Tracks each student's quiz attempts for a specific topic (max 2).
-- The score stored is the raw percentage 0-100.
CREATE TABLE IF NOT EXISTS public.topic_quiz_attempts (
  id           serial       PRIMARY KEY,
  student_id   uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id     integer      NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  attempt_num  smallint     NOT NULL CHECK (attempt_num IN (1, 2)),
  score        integer      NOT NULL CHECK (score BETWEEN 0 AND 100),
  answers      jsonb        NOT NULL DEFAULT '[]',  -- [{question_index, chosen_index}]
  submitted_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (student_id, topic_id, attempt_num)
);

CREATE INDEX IF NOT EXISTS topic_quiz_attempts_student_topic_idx
  ON public.topic_quiz_attempts (student_id, topic_id);

ALTER TABLE public.topic_quiz_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='topic_quiz_attempts' AND policyname='tqa_service_role') THEN
    CREATE POLICY tqa_service_role ON public.topic_quiz_attempts TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Students can read their own attempts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='topic_quiz_attempts' AND policyname='tqa_student_select') THEN
    CREATE POLICY tqa_student_select ON public.topic_quiz_attempts FOR SELECT USING (student_id = auth.uid());
  END IF;
END $$;

-- ── 2. certificates ────────────────────────────────────────────────────────
-- Issued after a student passes the module final assessment.
CREATE TABLE IF NOT EXISTS public.certificates (
  id                 serial       PRIMARY KEY,
  student_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id          integer      NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  score              integer      NOT NULL CHECK (score BETWEEN 0 AND 100),
  tier               text         NOT NULL CHECK (tier IN ('achievement', 'excellent', 'completion')),
  certificate_number text         NOT NULL UNIQUE,  -- e.g. B2B-2025-001
  issued_at          timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (student_id, module_id)   -- one certificate per student per module
);

CREATE INDEX IF NOT EXISTS certificates_student_id_idx ON public.certificates (student_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certificates' AND policyname='cert_service_role') THEN
    CREATE POLICY cert_service_role ON public.certificates TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certificates' AND policyname='cert_student_select') THEN
    CREATE POLICY cert_student_select ON public.certificates FOR SELECT USING (student_id = auth.uid());
  END IF;
END $$;

-- ── End of migration ────────────────────────────────────────────────────────
