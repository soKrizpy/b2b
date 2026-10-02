-- supabase/migrations/0003_phase3_student_xp.sql
-- Phase 3 additive migration — Gamification XP column on public.students.
-- Additive only: IF NOT EXISTS guard. Never alters existing columns.
-- Safe to re-run.

-- Add total_xp to students (mirrors the coins pattern already in the table).
-- Existing rows default to 0 — no student data is lost.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;

-- Index for leaderboard queries (optional, added for future use)
CREATE INDEX IF NOT EXISTS students_total_xp_idx
  ON public.students (total_xp DESC);
