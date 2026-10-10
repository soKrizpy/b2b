-- supabase\migrations\0008_retention_policy.sql
-- Auto-delete learning history older than 1 year.
-- Safe to re-run: uses CREATE OR REPLACE and IF NOT EXISTS guards.
-- Tables covered:
--   topic_quiz_attempts  — 2-attempt quiz records per student per topic
--   topic_progress       — engine lesson XP records
--   certificates are intentionally EXCLUDED — permanent records
--   invoices are intentionally EXCLUDED — financial audit trail
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Retention function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_expired_learning_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove quiz attempt records older than 1 year
  DELETE FROM public.topic_quiz_attempts
  WHERE submitted_at < NOW() - INTERVAL '1 year';

  -- Remove engine topic progress records older than 1 year
  DELETE FROM public.topic_progress
  WHERE completed_at < NOW() - INTERVAL '1 year';

  RAISE NOTICE 'delete_expired_learning_logs: completed at %', NOW();
END;
$$;

-- ── 2. Grant execute to service_role only ─────────────────────────────────────
-- Prevents accidental calls from the anon / authenticated roles.

REVOKE ALL ON FUNCTION delete_expired_learning_logs() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION delete_expired_learning_logs() TO service_role;

-- ── 3. Schedule via pg_cron (if extension is enabled in your Supabase project) ─
-- Uncomment and run once after enabling pg_cron in Supabase Dashboard →
-- Database → Extensions → pg_cron.
--
-- SELECT cron.schedule(
--   'delete-expired-learning-logs',   -- job name (unique)
--   '0 3 * * *',                      -- daily at 03:00 UTC
--   'SELECT delete_expired_learning_logs()'
-- );

-- ── 4. Indexes to make the DELETE fast ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS tqa_submitted_at_idx
  ON public.topic_quiz_attempts (submitted_at);

CREATE INDEX IF NOT EXISTS tp_completed_at_idx
  ON public.topic_progress (completed_at);
