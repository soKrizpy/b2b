-- supabase/migrations/0010_teacher_students_relation.sql
-- Dedicated teacher-student enrollment relation table for long-term mentorship tracking.

CREATE TABLE IF NOT EXISTS public.teacher_students (
  id BIGSERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT uq_teacher_student UNIQUE(teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON public.teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON public.teacher_students(student_id);

-- Enable RLS
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teacher_students' AND policyname = 'teacher_students_read_all'
  ) THEN
    CREATE POLICY teacher_students_read_all ON public.teacher_students
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teacher_students' AND policyname = 'teacher_students_modify_admin'
  ) THEN
    CREATE POLICY teacher_students_modify_admin ON public.teacher_students
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;
