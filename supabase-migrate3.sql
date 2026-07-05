-- =============================================================
-- MIGRATION 3 — Add admin_note to reschedule_requests
-- Project: lxrwkbobosdmaqrmlvpd
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Add admin_note column so admins can leave a message that students will see
ALTER TABLE public.reschedule_requests
  ADD COLUMN IF NOT EXISTS admin_note text;

-- Done ✓
-- After running this, the resolveRequest() function in admin.js will
-- automatically populate this column when admin approves or rejects a request.
