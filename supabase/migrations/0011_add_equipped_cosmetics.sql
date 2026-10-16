-- supabase/migrations/0011_add_equipped_cosmetics.sql
-- Additive migration for Cyber-Fantasy Avatar & Multi-Slot Cosmetic Shop.
-- Stores equipped cosmetics as JSONB with backward-compatible defaults.
-- Safe to re-run. Never alters existing columns destructively.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS equipped_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.students.equipped_cosmetics IS 'Stores multi-slot equipped cosmetics: { archetype, skinTone, hatId, outfitId, auraId, petId, petHatId, titleId }';

-- Backfill existing equipped_hat_id, title_id, and avatar_id into equipped_cosmetics for consistency
UPDATE public.students
SET equipped_cosmetics = jsonb_build_object(
  'archetype', COALESCE(avatar_id, 'cyber-mage'),
  'hatId', equipped_hat_id,
  'titleId', title_id,
  'petId', COALESCE(avatar_id, 'cat')
)
WHERE equipped_cosmetics = '{}'::jsonb
  AND (equipped_hat_id IS NOT NULL OR title_id IS NOT NULL OR avatar_id IS NOT NULL);
