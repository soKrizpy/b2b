-- =============================================
-- Migration 11 — Slot Reservation System
-- Prevents double-booking when student picks a slot
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add reserved_by + reserved_at columns to available_slots
alter table public.available_slots
  add column if not exists reserved_by uuid references public.profiles(id) on delete set null,
  add column if not exists reserved_at timestamptz;

-- 2. Make sure RLS is enabled on available_slots
alter table public.available_slots enable row level security;

-- 3. Admin: full access (all existing admin policies remain)
drop policy if exists "slots_admin_all" on public.available_slots;
create policy "slots_admin_all"
  on public.available_slots for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Students: can READ all slots (to show in dropdown)
drop policy if exists "slots_student_read" on public.available_slots;
create policy "slots_student_read"
  on public.available_slots for select to authenticated
  using (true);

-- 5. Students: can RESERVE a slot (update status to 'reserved')
--    Only works if slot is currently 'available' and not already reserved
drop policy if exists "slots_student_reserve" on public.available_slots;
create policy "slots_student_reserve"
  on public.available_slots for update to authenticated
  using (
    status = 'available'
    and reserved_by is null
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
  )
  with check (
    status = 'reserved'
    and reserved_by = auth.uid()
  );

-- 6. Students: can RELEASE their own reservation (if request rejected by admin)
--    This is handled by admin via admin policy, but add student self-release too
drop policy if exists "slots_student_release" on public.available_slots;
create policy "slots_student_release"
  on public.available_slots for update to authenticated
  using (
    reserved_by = auth.uid()
    and status = 'reserved'
  )
  with check (
    status = 'available'
    and reserved_by is null
  );

-- 7. Index for fast lookups
create index if not exists slots_reserved_by_idx
  on public.available_slots(reserved_by)
  where reserved_by is not null;

create index if not exists slots_status_idx
  on public.available_slots(status);

notify pgrst, 'reload schema';
