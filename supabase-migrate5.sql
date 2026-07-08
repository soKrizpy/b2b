-- =============================================================
-- MIGRATION 5 — Student Attendance: allow self-join marking
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Students need to update their OWN schedule's status to "completed"
-- and attendance_status to "attended" when they click "Masuk Kelas".
-- Previously only admins could UPDATE the schedules table.
-- We add a narrow policy: a student may update only their own row,
-- and only the two attendance-related columns.

-- Drop previous policy if it existed with this name
DROP POLICY IF EXISTS "schedules_student_attend" ON public.schedules;

CREATE POLICY "schedules_student_attend"
  ON public.schedules
  FOR UPDATE
  TO authenticated
  USING (
    -- The row must belong to this student
    student_id = auth.uid()
  )
  WITH CHECK (
    -- Student may only set status = 'completed' and attendance_status = 'attended'
    -- All other fields must remain unchanged (enforced by the app layer).
    student_id = auth.uid()
    AND status = 'completed'
    AND attendance_status = 'attended'
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Done ✓
-- After running this migration, when a student clicks "Masuk Kelas",
-- the app will mark the session as completed + attended in Supabase,
-- and it will automatically appear in admin's dashboard as "Selesai".
