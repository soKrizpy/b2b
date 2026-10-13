-- 0009_performance_and_schema_upgrades.sql
-- Adds email to profiles (eliminates auth.admin.listUsers full scan),
-- structured final_assessment JSONB to modules, server-side announcements table,
-- and composite performance indexes for high-traffic queries.

-- 1. Add email column to public.profiles so teacher/user lookups don't require auth.admin.listUsers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing profiles with email from auth.users where possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. Add structured final_assessment JSONB column to public.modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS final_assessment JSONB DEFAULT NULL;

-- 3. Server-side announcements table (replaces browser-only localStorage)
CREATE TABLE IF NOT EXISTS public.announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  image_url  TEXT,
  target     TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'students', 'teachers')),
  urgency    TEXT NOT NULL DEFAULT 'info' CHECK (urgency IN ('info', 'warning', 'urgent')),
  expires_at TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Composite performance indexes for frequent dashboard and report queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_challenges_topic_id ON public.challenges(topic_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date_completed ON public.meetings(is_completed, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_students_student ON public.meeting_students(student_id, has_joined);
CREATE INDEX IF NOT EXISTS idx_topic_quiz_attempts_student_topic ON public.topic_quiz_attempts(student_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_student_completed ON public.topic_progress(student_id, completed_at);
