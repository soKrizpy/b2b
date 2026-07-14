-- =============================================================
-- MIGRATION 6 — Scalable LMS Modules
-- Project: lxrwkbobosdmaqrmlvpd
-- =============================================================

-- Drop legacy learning_paths table (as requested by user)
drop table if exists public.learning_paths cascade;

-- 1. modules table
create table if not exists public.modules (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 2. topics table
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  content_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. questions table (for both quizzes and exams)
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  parent_type text not null check (parent_type in ('topic_quiz', 'module_exam')),
  parent_id uuid not null, -- references topics.id or modules.id (cannot use strict FK constraint due to polymorphic association)
  question_text text not null,
  options jsonb not null, -- e.g. ["A", "B", "C", "D"]
  correct_index int not null, -- 0, 1, 2, or 3
  created_at timestamptz not null default now()
);

-- 4. module_enrollments table
create table if not exists public.module_enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status text not null default 'enrolled' check (status in ('enrolled', 'completed')),
  enrolled_at timestamptz not null default now(),
  unique(student_id, module_id)
);

-- 5. topic_progress table
create table if not exists public.topic_progress (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.module_enrollments(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  is_unlocked boolean not null default false,
  is_completed boolean not null default false,
  unlocked_at timestamptz,
  completed_at timestamptz,
  unique(enrollment_id, topic_id)
);

-- 6. quiz_attempts table
create table if not exists public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  score numeric not null,
  created_at timestamptz not null default now()
);

-- 7. exam_attempts table
create table if not exists public.exam_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  score numeric not null,
  created_at timestamptz not null default now()
);

-- RLS setup
alter table public.modules enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.module_enrollments enable row level security;
alter table public.topic_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.exam_attempts enable row level security;

-- Policies for modules, topics, questions (Admin manages, students read)
DROP POLICY IF EXISTS "modules_select" ON public.modules; CREATE POLICY "modules_select" ON public.modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "modules_all" ON public.modules; CREATE POLICY "modules_all" ON public.modules FOR ALL TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "topics_select" ON public.topics; CREATE POLICY "topics_select" ON public.topics FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "topics_all" ON public.topics; CREATE POLICY "topics_all" ON public.topics FOR ALL TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "questions_select" ON public.questions; CREATE POLICY "questions_select" ON public.questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "questions_all" ON public.questions; CREATE POLICY "questions_all" ON public.questions FOR ALL TO authenticated USING (private.is_admin());

-- Policies for progress tables
DROP POLICY IF EXISTS "enrollments_select" ON public.module_enrollments; CREATE POLICY "enrollments_select" ON public.module_enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "enrollments_all_admin" ON public.module_enrollments; CREATE POLICY "enrollments_all_admin" ON public.module_enrollments FOR ALL TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "topic_progress_select" ON public.topic_progress; CREATE POLICY "topic_progress_select" ON public.topic_progress FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.module_enrollments e WHERE e.id = topic_progress.enrollment_id AND (e.student_id = auth.uid() OR private.is_admin()))
);
DROP POLICY IF EXISTS "topic_progress_update_student" ON public.topic_progress; CREATE POLICY "topic_progress_update_student" ON public.topic_progress FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.module_enrollments e WHERE e.id = topic_progress.enrollment_id AND e.student_id = auth.uid())
);
DROP POLICY IF EXISTS "topic_progress_all_admin" ON public.topic_progress; CREATE POLICY "topic_progress_all_admin" ON public.topic_progress FOR ALL TO authenticated USING (private.is_admin());
DROP POLICY IF EXISTS "topic_progress_insert_student" ON public.topic_progress; CREATE POLICY "topic_progress_insert_student" ON public.topic_progress FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.module_enrollments e WHERE e.id = topic_progress.enrollment_id AND e.student_id = auth.uid())
);

-- Policies for quiz_attempts
DROP POLICY IF EXISTS "quiz_select" ON public.quiz_attempts; CREATE POLICY "quiz_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (student_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "quiz_insert" ON public.quiz_attempts; CREATE POLICY "quiz_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "quiz_all_admin" ON public.quiz_attempts; CREATE POLICY "quiz_all_admin" ON public.quiz_attempts FOR ALL TO authenticated USING (private.is_admin());

-- Policies for exam_attempts
DROP POLICY IF EXISTS "exam_select" ON public.exam_attempts; CREATE POLICY "exam_select" ON public.exam_attempts FOR SELECT TO authenticated USING (student_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "exam_insert" ON public.exam_attempts; CREATE POLICY "exam_insert" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR private.is_admin());
DROP POLICY IF EXISTS "exam_all_admin" ON public.exam_attempts; CREATE POLICY "exam_all_admin" ON public.exam_attempts FOR ALL TO authenticated USING (private.is_admin());

-- Notify pgrst
notify pgrst, 'reload schema';
