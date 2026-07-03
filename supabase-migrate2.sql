-- =============================================================
-- MIGRATION 2 — Fix remaining schema cache misses
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================


-- =============================================================
-- notifications: add missing 'type' column
-- =============================================================
alter table public.notifications
  add column if not exists type text not null default 'system'
    check (type in ('system', 'schedule', 'reminder'));

-- Ensure admin helper and notification policies exist
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

alter table public.notifications enable row level security;

grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

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
-- reschedule_requests: the table exists but PostgREST can't find
-- the foreign key relationship. This happens when the FK was not
-- created with the table. Add it now if missing.
-- =============================================================

-- First ensure student_id column exists
alter table public.reschedule_requests
  add column if not exists student_id uuid;

-- Drop old FK if broken, re-add cleanly
alter table public.reschedule_requests
  drop constraint if exists reschedule_requests_student_id_fkey;

alter table public.reschedule_requests
  add constraint reschedule_requests_student_id_fkey
    foreign key (student_id) references public.profiles(id) on delete cascade;

-- Same for schedule_id
alter table public.reschedule_requests
  drop constraint if exists reschedule_requests_schedule_id_fkey;

alter table public.reschedule_requests
  add column if not exists schedule_id uuid;

alter table public.reschedule_requests
  add constraint reschedule_requests_schedule_id_fkey
    foreign key (schedule_id) references public.schedules(id) on delete set null;

-- Ensure other required columns exist
alter table public.reschedule_requests
  add column if not exists requested_time timestamptz;

alter table public.reschedule_requests
  add column if not exists reason text not null default '';

alter table public.reschedule_requests
  add column if not exists status text not null default 'pending';

alter table public.reschedule_requests
  add column if not exists created_at timestamptz not null default now();

alter table public.reschedule_requests
  add column if not exists updated_at timestamptz not null default now();

-- Ensure status constraint
alter table public.reschedule_requests
  drop constraint if exists reschedule_requests_status_check;

alter table public.reschedule_requests
  add constraint reschedule_requests_status_check
    check (status in ('pending', 'approved', 'rejected'));

-- RLS
alter table public.reschedule_requests enable row level security;

grant select, insert, update, delete on public.reschedule_requests to authenticated;

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


-- =============================================================
-- Force PostgREST to reload schema cache
-- =============================================================
notify pgrst, 'reload schema';


-- =============================================================
-- DONE ✓
-- Fixed: notifications.type column added
-- Fixed: reschedule_requests foreign keys rebuilt
-- =============================================================
