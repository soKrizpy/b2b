-- =============================================================
-- MIGRATION — Add missing columns to existing tables
-- Run this in: Supabase Dashboard → SQL Editor
-- Safe to re-run: uses IF NOT EXISTS on each column
-- =============================================================

-- Ensure the admin helper exists for RLS policy checks
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select private.is_admin();
$$;

grant execute on function private.is_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- =============================================================
-- schedules: add missing columns
-- =============================================================
alter table public.schedules
  add column if not exists attendance_status text not null default 'pending'
    check (attendance_status in ('pending', 'attended', 'missed', 'rescheduled'));

alter table public.schedules
  add column if not exists teacher_note text;

alter table public.schedules
  add column if not exists updated_at timestamptz not null default now();

-- Make sure status column has the right constraint
-- (won't error if constraint already exists)
alter table public.schedules
  drop constraint if exists schedules_status_check;

alter table public.schedules
  add constraint schedules_status_check
    check (status in ('upcoming', 'completed', 'cancelled'));


-- =============================================================
-- learning_paths: add missing columns
-- =============================================================
alter table public.learning_paths
  add column if not exists resource_url text;

alter table public.learning_paths
  add column if not exists homework_text text;

alter table public.learning_paths
  add column if not exists homework_done boolean not null default false;

alter table public.learning_paths
  add column if not exists updated_at timestamptz not null default now();


-- =============================================================
-- profiles: add missing columns
-- =============================================================
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();


-- =============================================================
-- reschedule_requests: create if it doesn't exist yet
-- =============================================================
create table if not exists public.reschedule_requests (
  id             uuid primary key default uuid_generate_v4(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  schedule_id    uuid references public.schedules(id) on delete set null,
  requested_time timestamptz,
  reason         text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.reschedule_requests enable row level security;

drop policy if exists "reschedule_select" on public.reschedule_requests;
drop policy if exists "reschedule_insert" on public.reschedule_requests;
drop policy if exists "reschedule_update" on public.reschedule_requests;
drop policy if exists "reschedule_delete" on public.reschedule_requests;

create policy "reschedule_select"
  on public.reschedule_requests for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

create policy "reschedule_insert"
  on public.reschedule_requests for insert to authenticated
  with check ( student_id = auth.uid() );

create policy "reschedule_update"
  on public.reschedule_requests for update to authenticated
  using ( private.is_admin() );

create policy "reschedule_delete"
  on public.reschedule_requests for delete to authenticated
  using ( private.is_admin() );

grant select, insert, update, delete on public.reschedule_requests to authenticated;


-- =============================================================
-- RLS compatibility for admin writes
-- =============================================================

alter table public.schedules enable row level security;
alter table public.learning_paths enable row level security;
alter table public.notifications enable row level security;

grant select, insert, update, delete on public.schedules to authenticated;
grant select, insert, update, delete on public.learning_paths to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "schedules_select" on public.schedules;
drop policy if exists "schedules_insert" on public.schedules;
drop policy if exists "schedules_update" on public.schedules;
drop policy if exists "schedules_delete" on public.schedules;

drop policy if exists "learning_paths_select" on public.learning_paths;
drop policy if exists "learning_paths_insert" on public.learning_paths;
drop policy if exists "learning_paths_update" on public.learning_paths;
drop policy if exists "learning_paths_delete" on public.learning_paths;

drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

create policy "schedules_select"
  on public.schedules for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

create policy "schedules_insert"
  on public.schedules for insert to authenticated
  with check ( private.is_admin() );

create policy "schedules_update"
  on public.schedules for update to authenticated
  using ( private.is_admin() );

create policy "schedules_delete"
  on public.schedules for delete to authenticated
  using ( private.is_admin() );

create policy "learning_paths_select"
  on public.learning_paths for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

create policy "learning_paths_insert"
  on public.learning_paths for insert to authenticated
  with check ( private.is_admin() );

create policy "learning_paths_update"
  on public.learning_paths for update to authenticated
  using ( private.is_admin() );

create policy "learning_paths_delete"
  on public.learning_paths for delete to authenticated
  using ( private.is_admin() );

create policy "notifications_select"
  on public.notifications for select to authenticated
  using ( user_id = auth.uid() );

create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check ( private.is_admin() or user_id = auth.uid() );

create policy "notifications_update"
  on public.notifications for update to authenticated
  using ( user_id = auth.uid() or private.is_admin() );

create policy "notifications_delete"
  on public.notifications for delete to authenticated
  using ( private.is_admin() );


-- =============================================================
-- Indexes (safe to re-run)
-- =============================================================
create index if not exists idx_schedules_student_id  on public.schedules(student_id);
create index if not exists idx_schedules_start_time  on public.schedules(start_time);
create index if not exists idx_schedules_status       on public.schedules(status);
create index if not exists idx_learning_paths_student on public.learning_paths(student_id);
create index if not exists idx_notifications_user_id  on public.notifications(user_id);
create index if not exists idx_reschedule_student     on public.reschedule_requests(student_id);


-- =============================================================
-- Refresh Supabase schema cache so PostgREST picks up new columns
-- =============================================================
notify pgrst, 'reload schema';


-- =============================================================
-- DONE ✓
-- Added: attendance_status, teacher_note to schedules
-- Added: resource_url, homework_text, homework_done to learning_paths
-- Created reschedule_requests if missing
-- =============================================================
