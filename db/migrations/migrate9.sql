-- Migration 9 - Ensure topic_progress supports locked/unlocked flow
-- Run in Supabase SQL Editor

alter table public.topic_progress add column if not exists is_unlocked boolean not null default false;
alter table public.topic_progress add column if not exists unlocked_at timestamptz;
alter table public.topic_progress add column if not exists is_completed boolean not null default false;
alter table public.topic_progress add column if not exists completed_at timestamptz;

-- Index for fast lookups
create index if not exists topic_progress_enrollment_idx on public.topic_progress(enrollment_id);

-- Ensure RLS allows student to update is_unlocked when class completed (already covered by existing policy)
-- If not, add:
drop policy if exists "topic_progress_update_student_unlock" on public.topic_progress;
create policy "topic_progress_update_student_unlock"
  on public.topic_progress for update to authenticated
  using ( exists (select 1 from public.module_enrollments e where e.id = enrollment_id and e.student_id = auth.uid()) )
  with check ( exists (select 1 from public.module_enrollments e where e.id = enrollment_id and e.student_id = auth.uid()) );

notify pgrst, 'reload schema';
