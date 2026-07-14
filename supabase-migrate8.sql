-- =============================================================
-- MIGRATION 8 — Fix LMS schema for full module/topic/quiz/exam flow
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Drop learning_paths (restored in migrate7, no longer needed)
DROP TABLE IF EXISTS public.learning_paths CASCADE;

-- 2. Fix quiz_attempts — materi.js used wrong column names.
--    Correct columns: student_id, topic_id, score
--    Drop and recreate to ensure correct schema.
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
CREATE TABLE public.quiz_attempts (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id    uuid        NOT NULL REFERENCES public.topics(id)   ON DELETE CASCADE,
  score       numeric     NOT NULL DEFAULT 0,
  passed      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Fix exam_attempts — add passed column
DROP TABLE IF EXISTS public.exam_attempts CASCADE;
CREATE TABLE public.exam_attempts (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  module_id   uuid        NOT NULL REFERENCES public.modules(id)   ON DELETE CASCADE,
  score       numeric     NOT NULL DEFAULT 0,
  passed      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. Ensure topic_progress has all needed columns
ALTER TABLE public.topic_progress
  ADD COLUMN IF NOT EXISTS quiz_score numeric DEFAULT NULL;

-- 5. Re-enable RLS on recreated tables
ALTER TABLE public.quiz_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts  ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for quiz_attempts
DROP POLICY IF EXISTS "quiz_select"    ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_insert"    ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_all_admin" ON public.quiz_attempts;

CREATE POLICY "quiz_select"    ON public.quiz_attempts FOR SELECT    TO authenticated USING (student_id = auth.uid() OR private.is_admin());
CREATE POLICY "quiz_insert"    ON public.quiz_attempts FOR INSERT    TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "quiz_all_admin" ON public.quiz_attempts FOR ALL       TO authenticated USING (private.is_admin());

-- 7. RLS policies for exam_attempts
DROP POLICY IF EXISTS "exam_select"    ON public.exam_attempts;
DROP POLICY IF EXISTS "exam_insert"    ON public.exam_attempts;
DROP POLICY IF EXISTS "exam_all_admin" ON public.exam_attempts;

CREATE POLICY "exam_select"    ON public.exam_attempts FOR SELECT    TO authenticated USING (student_id = auth.uid() OR private.is_admin());
CREATE POLICY "exam_insert"    ON public.exam_attempts FOR INSERT    TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "exam_all_admin" ON public.exam_attempts FOR ALL       TO authenticated USING (private.is_admin());

-- 8. Allow students to insert/update their own topic_progress
DROP POLICY IF EXISTS "topic_progress_insert_student" ON public.topic_progress;
DROP POLICY IF EXISTS "topic_progress_update_student" ON public.topic_progress;

CREATE POLICY "topic_progress_insert_student"
  ON public.topic_progress FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.module_enrollments e
            WHERE e.id = topic_progress.enrollment_id AND e.student_id = auth.uid())
  );

CREATE POLICY "topic_progress_update_student"
  ON public.topic_progress FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.module_enrollments e
            WHERE e.id = topic_progress.enrollment_id AND e.student_id = auth.uid())
  );

-- 9. Allow students to enroll themselves (insert their own enrollment)
DROP POLICY IF EXISTS "enrollments_insert_student" ON public.module_enrollments;
CREATE POLICY "enrollments_insert_student"
  ON public.module_enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- 10. Allow students to update enrollment status (to 'completed')
DROP POLICY IF EXISTS "enrollments_update_student" ON public.module_enrollments;
CREATE POLICY "enrollments_update_student"
  ON public.module_enrollments FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND status = 'completed');

-- 11. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts  TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Done ✓
-- After running this:
-- • learning_paths is gone
-- • quiz_attempts has correct columns (student_id, topic_id, score, passed)
-- • exam_attempts has correct columns (student_id, module_id, score, passed)
-- • Students can self-enroll and track their own topic/exam progress
