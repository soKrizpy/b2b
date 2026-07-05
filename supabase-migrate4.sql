-- =============================================================
-- MIGRATION 4 — Slot-Based Scheduling
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Create available_slots table
create table if not exists public.available_slots (
  id          uuid primary key default uuid_generate_v4(),
  start_time  timestamptz not null,
  status      text not null default 'available' check (status in ('available', 'booked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Add slot_id reference to reschedule_requests
alter table public.reschedule_requests
  add column if not exists slot_id uuid references public.available_slots(id) on delete set null;

-- 3. Enable RLS on available_slots
alter table public.available_slots enable row level security;

-- 4. Set up policies
drop policy if exists "available_slots_select" on public.available_slots;
drop policy if exists "available_slots_insert" on public.available_slots;
drop policy if exists "available_slots_update" on public.available_slots;
drop policy if exists "available_slots_delete" on public.available_slots;

-- Select: all authenticated users
create policy "available_slots_select"
  on public.available_slots for select to authenticated
  using ( true );

-- Insert: admin only
create policy "available_slots_insert"
  on public.available_slots for insert to authenticated
  with check ( private.is_admin() );

-- Update: admin only
create policy "available_slots_update"
  on public.available_slots for update to authenticated
  using ( private.is_admin() );

-- Delete: admin only
create policy "available_slots_delete"
  on public.available_slots for delete to authenticated
  using ( private.is_admin() );

-- 5. Grant access
grant select, insert, update, delete on public.available_slots to authenticated;

-- 6. Reload schema
notify pgrst, 'reload schema';

-- Done ✓
