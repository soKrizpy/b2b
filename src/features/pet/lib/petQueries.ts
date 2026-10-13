// src/features/pet/lib/petQueries.ts
// Fetches the gamification data for the student pet widget.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface StudentGamificationData {
  studentId:     string;
  fullName:      string;
  avatarId:      string | null;
  totalXp:       number;
  coins:         number;
  inventory:     string[];
  equippedHatId: string | null;
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
    .select('id, full_name, avatar_id, total_xp, coins, inventory, equipped_hat_id')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: {
        id: string;
        full_name: string;
        avatar_id: string | null;
        total_xp: number;
        coins: number;
        inventory: string[] | null;
        equipped_hat_id: string | null;
      } | null;
      error: { message: string } | null;
    }>);

  if (error) {
    console.error('[getStudentGamificationData]', error.message);
    return null;
  }

  if (!data) return null;

  return {
    studentId:     data.id,
    fullName:      data.full_name,
    avatarId:      data.avatar_id,
    totalXp:       data.total_xp ?? 0,
    coins:         data.coins    ?? 0,
    inventory:     Array.isArray(data.inventory) ? data.inventory : [],
    equippedHatId: data.equipped_hat_id ?? null,
  };
}
