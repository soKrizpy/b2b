-- =============================================
-- Migration 10 — Gamification Layer
-- Streak, XP, Badges, Realtime-ready
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add gamification columns to profiles
alter table public.profiles
  add column if not exists total_xp       integer not null default 0,
  add column if not exists streak_days    integer not null default 0,
  add column if not exists last_activity_date date;

-- 2. XP event log — every XP award is recorded here
create table if not exists public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,
  reason      text not null,  -- 'daily_login','topic_complete','quiz_pass','class_attend','module_complete'
  ref_id      uuid,           -- optional: schedule_id, topic_id, etc.
  created_at  timestamptz not null default now()
);

-- 3. Badges earned by students
create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  badge_type  text not null,  -- see badge types below
  earned_at   timestamptz not null default now(),
  unique(student_id, badge_type)
);

-- Badge types reference:
-- 'first_class'       — attended first ever class
-- 'streak_3'          — 3-day streak
-- 'streak_7'          — 7-day streak
-- 'streak_30'         — 30-day streak
-- 'quiz_master'       — passed 10 quizzes
-- 'topic_10'          — completed 10 topics
-- 'module_complete'   — completed a full module (12 topics + exam)
-- 'xp_100'            — reached 100 XP
-- 'xp_500'            — reached 500 XP
-- 'xp_1000'           — reached 1000 XP

-- 4. Indexes
create index if not exists xp_events_student_idx on public.xp_events(student_id, created_at desc);
create index if not exists badges_student_idx    on public.badges(student_id);

-- 5. RLS for xp_events
alter table public.xp_events enable row level security;

drop policy if exists "xp_events_student_read" on public.xp_events;
create policy "xp_events_student_read"
  on public.xp_events for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "xp_events_student_insert" on public.xp_events;
create policy "xp_events_student_insert"
  on public.xp_events for insert to authenticated
  with check (student_id = auth.uid());

-- 6. RLS for badges
alter table public.badges enable row level security;

drop policy if exists "badges_student_read" on public.badges;
create policy "badges_student_read"
  on public.badges for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "badges_student_insert" on public.badges;
create policy "badges_student_insert"
  on public.badges for insert to authenticated
  with check (student_id = auth.uid());

-- 7. Allow students to update their own XP + streak on profiles
drop policy if exists "profiles_student_update_xp" on public.profiles;
create policy "profiles_student_update_xp"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 8. Enable Realtime on notifications table (for instant push)
-- (Run this once — idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
