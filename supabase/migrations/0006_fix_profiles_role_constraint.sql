-- supabase/migrations/0006_fix_profiles_role_constraint.sql
-- Fixes the profiles_role_check constraint to accept ('admin', 'teacher', 'student').
-- The production DB was created with a different constraint (possibly only 'admin'/'student',
-- or using Indonesian values like 'guru'). This migration safely replaces it.
-- Safe to re-run: uses IF EXISTS / conditional logic.

-- ── 1. Ensure profiles table exists (idempotent) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Drop the existing role check constraint (whatever it's named) ──────────
-- We find and drop any CHECK constraint on the role column dynamically.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint);
    RAISE NOTICE 'Dropped constraint: %', v_constraint;
  ELSE
    RAISE NOTICE 'No role check constraint found — skipping drop.';
  END IF;
END$$;

-- ── 3. Add the correct constraint ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'student'));

-- ── 4. Ensure RLS is enabled ──────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 5. Ensure self-select policy exists ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_select'
  ) THEN
    CREATE POLICY profiles_self_select ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END$$;

-- ── 6. Service role full access ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_service_role_all'
  ) THEN
    CREATE POLICY profiles_service_role_all ON public.profiles
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;
