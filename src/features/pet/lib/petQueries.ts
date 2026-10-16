// src/features/pet/lib/petQueries.ts
// Fetches the gamification data for the student avatar & pet widgets.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { EquippedCosmetics } from '@/types/database';

export interface StudentGamificationData {
  studentId:          string;
  fullName:           string;
  avatarId:           string | null;
  totalXp:            number;
  coins:              number;
  inventory:          string[];
  equippedHatId:      string | null;
  equippedCosmetics:  EquippedCosmetics;
}

/**
 * Returns gamification fields for a student from public.students.
 * Returns null when the student row does not exist.
 */
export async function getStudentGamificationData(
  studentId: string
): Promise<StudentGamificationData | null> {
  const db = createSupabaseAdminClient();

  const { data, error } = await (db
    .from('students')
    .select('id, full_name, avatar_id, title_id, total_xp, coins, inventory, equipped_hat_id, equipped_cosmetics')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: {
        id: string;
        full_name: string;
        avatar_id: string | null;
        title_id: string | null;
        total_xp: number;
        coins: number;
        inventory: string[] | null;
        equipped_hat_id: string | null;
        equipped_cosmetics?: EquippedCosmetics | null;
      } | null;
      error: { message: string } | null;
    }>);

  if (error) {
    console.error('[getStudentGamificationData]', error.message);
    return null;
  }

  if (!data) return null;

  // Safely resolve equipped cosmetics with backward-compatible defaults
  const rawCosmetics = (data.equipped_cosmetics && typeof data.equipped_cosmetics === 'object')
    ? (data.equipped_cosmetics as EquippedCosmetics)
    : {};

  const equippedCosmetics: EquippedCosmetics = {
    archetype: rawCosmetics.archetype || 'cyber-mage',
    skinTone:  rawCosmetics.skinTone || 'default',
    hatId:     rawCosmetics.hatId !== undefined ? rawCosmetics.hatId : data.equipped_hat_id,
    outfitId:  rawCosmetics.outfitId || 'outfit-cyber-hoodie',
    auraId:    rawCosmetics.auraId || null,
    petId:     rawCosmetics.petId || (data.avatar_id && ['cat', 'fox', 'dragon', 'robot', 'bunny', 'owl', 'dog'].includes(data.avatar_id) ? data.avatar_id : 'cat'),
    petHatId:  rawCosmetics.petHatId || null,
    titleId:   rawCosmetics.titleId !== undefined ? rawCosmetics.titleId : data.title_id,
  };

  return {
    studentId:         data.id,
    fullName:          data.full_name,
    avatarId:          data.avatar_id,
    totalXp:           data.total_xp ?? 0,
    coins:             data.coins    ?? 0,
    inventory:         Array.isArray(data.inventory) ? data.inventory : [],
    equippedHatId:     equippedCosmetics.hatId ?? null,
    equippedCosmetics,
  };
}
