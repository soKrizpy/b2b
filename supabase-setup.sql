-- =============================================================
-- SUPABASE FULL SETUP — Kelas Coding
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / ON CONFLICT
-- =============================================================


-- =============================================================
-- 1. EXTENSIONS
-- =============================================================
create extension if not exists "uuid-ossp";


-- =============================================================
-- 2. PRIVATE SCHEMA HELPER
-- =============================================================
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
-- 3. TABLES
-- =============================================================

-- PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default 'Siswa Baru',
  role        text not null default 'student' check (role in ('admin', 'student')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- SCHEDULES
create table if not exists public.schedules (
  id                uuid primary key default uuid_generate_v4(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  start_time        timestamptz not null,
  meeting_link      text not null,
  status            text not null default 'upcoming'
                      check (status in ('upcoming', 'completed', 'cancelled')),
  attendance_status text not null default 'pending'
                      check (attendance_status in ('pending', 'attended', 'missed', 'rescheduled')),
  teacher_note      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- LEARNING PATHS
create table if not exists public.learning_paths (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  module_name   text not null,
  order_index   integer not null default 1,
  is_completed  boolean not null default false,
  resource_url  text,
  homework_text text,
  homework_done boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null default 'system'
               check (type in ('system', 'schedule', 'reminder')),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- RESCHEDULE REQUESTS
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


-- =============================================================
-- 4. INDEXES
-- =============================================================
create index if not exists idx_schedules_student_id   on public.schedules(student_id);
create index if not exists idx_schedules_start_time   on public.schedules(start_time);
create index if not exists idx_schedules_status        on public.schedules(status);
create index if not exists idx_learning_paths_student  on public.learning_paths(student_id);
create index if not exists idx_learning_paths_order    on public.learning_paths(student_id, order_index);
create index if not exists idx_notifications_user_id   on public.notifications(user_id);
create index if not exists idx_notifications_unread    on public.notifications(user_id, is_read);
create index if not exists idx_reschedule_student      on public.reschedule_requests(student_id);
create index if not exists idx_reschedule_status       on public.reschedule_requests(status);


-- =============================================================
-- 5. AUTO-UPDATE updated_at TRIGGER
-- =============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at        on public.profiles;
drop trigger if exists trg_schedules_updated_at       on public.schedules;
drop trigger if exists trg_learning_paths_updated_at  on public.learning_paths;
drop trigger if exists trg_reschedule_updated_at      on public.reschedule_requests;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_schedules_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

create trigger trg_learning_paths_updated_at
  before update on public.learning_paths
  for each row execute function public.set_updated_at();

create trigger trg_reschedule_updated_at
  before update on public.reschedule_requests
  for each row execute function public.set_updated_at();


-- =============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1),
      'Siswa Baru'
    ),
    case
      when lower(new.email) = 'st.dwi89@gmail.com' then 'admin'
      else 'student'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles            enable row level security;
alter table public.schedules           enable row level security;
alter table public.learning_paths      enable row level security;
alter table public.notifications       enable row level security;
alter table public.reschedule_requests enable row level security;


-- =============================================================
-- 8. REVOKE DEFAULT PUBLIC/ANON ACCESS
-- =============================================================
revoke all on table public.profiles            from anon, public;
revoke all on table public.schedules           from anon, public;
revoke all on table public.learning_paths      from anon, public;
revoke all on table public.notifications       from anon, public;
revoke all on table public.reschedule_requests from anon, public;


-- =============================================================
-- 9. GRANT ACCESS TO AUTHENTICATED USERS
-- =============================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles            to authenticated;
grant select, insert, update, delete on public.schedules           to authenticated;
grant select, insert, update, delete on public.learning_paths      to authenticated;
grant select, insert, update, delete on public.notifications       to authenticated;
grant select, insert, update, delete on public.reschedule_requests to authenticated;


-- =============================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =============================================================

-- Drop all existing policies first (clean slate)
drop policy if exists "profiles_select"              on public.profiles;
drop policy if exists "profiles_insert"              on public.profiles;
drop policy if exists "profiles_update"              on public.profiles;
drop policy if exists "profiles_delete"              on public.profiles;

drop policy if exists "schedules_select"             on public.schedules;
drop policy if exists "schedules_insert"             on public.schedules;
drop policy if exists "schedules_update"             on public.schedules;
drop policy if exists "schedules_delete"             on public.schedules;

drop policy if exists "learning_paths_select"        on public.learning_paths;
drop policy if exists "learning_paths_insert"        on public.learning_paths;
drop policy if exists "learning_paths_update"        on public.learning_paths;
drop policy if exists "learning_paths_delete"        on public.learning_paths;

drop policy if exists "notifications_select"         on public.notifications;
drop policy if exists "notifications_insert"         on public.notifications;
drop policy if exists "notifications_update"         on public.notifications;
drop policy if exists "notifications_delete"         on public.notifications;

drop policy if exists "reschedule_select"            on public.reschedule_requests;
drop policy if exists "reschedule_insert"            on public.reschedule_requests;
drop policy if exists "reschedule_update"            on public.reschedule_requests;
drop policy if exists "reschedule_delete"            on public.reschedule_requests;

-- Also drop old policy names from previous repair script
drop policy if exists "Profiles viewable by authenticated"          on public.profiles;
drop policy if exists "Users view own profile or admins view all"   on public.profiles;

-- ── PROFILES ──────────────────────────────────────────────────
-- SELECT: own row OR admin sees all
create policy "profiles_select"
  on public.profiles for select to authenticated
  using ( id = auth.uid() or private.is_admin() );

-- INSERT: only via trigger (handle_new_user) or admin
create policy "profiles_insert"
  on public.profiles for insert to authenticated
  with check ( private.is_admin() );

-- UPDATE: own row OR admin
create policy "profiles_update"
  on public.profiles for update to authenticated
  using ( id = auth.uid() or private.is_admin() );

-- DELETE: admin only
create policy "profiles_delete"
  on public.profiles for delete to authenticated
  using ( private.is_admin() );

-- ── SCHEDULES ─────────────────────────────────────────────────
-- SELECT: own schedules OR admin sees all
create policy "schedules_select"
  on public.schedules for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

-- INSERT: admin only
create policy "schedules_insert"
  on public.schedules for insert to authenticated
  with check ( private.is_admin() );

-- UPDATE: admin only
create policy "schedules_update"
  on public.schedules for update to authenticated
  using ( private.is_admin() );

-- DELETE: admin only
create policy "schedules_delete"
  on public.schedules for delete to authenticated
  using ( private.is_admin() );

-- ── LEARNING PATHS ────────────────────────────────────────────
-- SELECT: own modules OR admin sees all
create policy "learning_paths_select"
  on public.learning_paths for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

-- INSERT: admin only
create policy "learning_paths_insert"
  on public.learning_paths for insert to authenticated
  with check ( private.is_admin() );

-- UPDATE: admin only
create policy "learning_paths_update"
  on public.learning_paths for update to authenticated
  using ( private.is_admin() );

-- DELETE: admin only
create policy "learning_paths_delete"
  on public.learning_paths for delete to authenticated
  using ( private.is_admin() );

-- ── NOTIFICATIONS ─────────────────────────────────────────────
-- SELECT: own notifications only
create policy "notifications_select"
  on public.notifications for select to authenticated
  using ( user_id = auth.uid() );

-- INSERT: admin can insert for any user (broadcast / schedule alerts)
create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check ( private.is_admin() or user_id = auth.uid() );

-- UPDATE: own notifications only (mark as read)
create policy "notifications_update"
  on public.notifications for update to authenticated
  using ( user_id = auth.uid() or private.is_admin() );

-- DELETE: admin only
create policy "notifications_delete"
  on public.notifications for delete to authenticated
  using ( private.is_admin() );

-- ── RESCHEDULE REQUESTS ───────────────────────────────────────
-- SELECT: own requests OR admin sees all
create policy "reschedule_select"
  on public.reschedule_requests for select to authenticated
  using ( student_id = auth.uid() or private.is_admin() );

-- INSERT: students insert their own requests only
create policy "reschedule_insert"
  on public.reschedule_requests for insert to authenticated
  with check ( student_id = auth.uid() );

-- UPDATE: admin only (approve / reject)
create policy "reschedule_update"
  on public.reschedule_requests for update to authenticated
  using ( private.is_admin() );

-- DELETE: admin only
create policy "reschedule_delete"
  on public.reschedule_requests for delete to authenticated
  using ( private.is_admin() );


-- =============================================================
-- 11. BACKFILL: create profile rows for any existing auth users
--     that don't have one yet (safe to re-run)
-- =============================================================
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1),
    'Siswa Baru'
  ) as full_name,
  case
    when lower(u.email) = 'st.dwi89@gmail.com' then 'admin'
    else 'student'
  end as role
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Ensure st.dwi89@gmail.com is always admin even if row already existed
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = 'st.dwi89@gmail.com'
)
and role <> 'admin';


-- =============================================================
-- DONE ✓
-- Tables  : profiles, schedules, learning_paths,
--           notifications, reschedule_requests
-- Triggers: auto-create profile on signup, auto-update updated_at
-- RLS     : students see only their own data, admin sees everything
-- Admin   : st.dwi89@gmail.com
-- =============================================================
