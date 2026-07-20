-- =============================================
-- Migration 11 — Slot Reservation System
-- Prevents double-booking when student picks a slot
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add reserved_by to available_slots
alter table public.available_slots
  add column if not exists reserved_by uuid references public.profiles(id) on delete set null,
  add column if not exists reserved_at timestamptz;

-- 2. Update status check: slot is only truly available when status='available' AND reserved_by IS NULL
-- (No schema change needed — app logic handles this)

-- 3. Allow students to update slot status to 'reserved' (they can only reserve, not delete)
drop policy if exists "slots_student_reserve" on public.available_slots;
create policy "slots_student_reserve"
  on public.available_slots for update to authenticated
  using (status = 'available' and reserved_by is null)
  with check (reserved_by = auth.uid() and status = 'reserved');

-- 4. Allow students to read available slots
drop policy if exists "slots_read_authenticated" on public.available_slots;
create policy "slots_read_authenticated"
  on public.available_slots for select to authenticated
  using (true);

-- 5. Index
create index if not exists slots_reserved_by_idx on public.available_slots(reserved_by) where reserved_by is not null;

notify pgrst, 'reload schema';
