'use server';
// src/features/pet/actions/shopActions.ts
// Server Actions for the Cyber-Fantasy Avatar & Pet Cosmetic Shop.
// Auth-gated via session — student only.

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccessoryById } from '@/features/pet/lib/avatarShopCatalog';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import type { EquippedCosmetics } from '@/types/database';

export type ShopActionResult =
  | {
      success: true;
      message: string;
      coins?: number;
      inventory?: string[];
      equippedCosmetics?: EquippedCosmetics;
      equippedHatId?: string | null;
    }
  | { success: false; error: string };

// ── buyCosmetic ─────────────────────────────────────────────────────────────

export async function buyCosmetic(
  _prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { success: false, error: 'Tidak terautentikasi.' };

  const itemId = (formData.get('item_id') as string | null)?.trim();
  const item   = getAccessoryById(itemId);
  if (!item) return { success: false, error: 'Item kosmetik tidak ditemukan di katalog.' };

  const db = createSupabaseAdminClient();

  const { data: student, error: sErr } = await (db
    .from('students')
    .select('coins, total_xp, inventory, equipped_cosmetics')
    .eq('id', user.id)
    .maybeSingle() as unknown as Promise<{
      data: {
        coins: number;
        total_xp: number;
        inventory: string[] | null;
        equipped_cosmetics?: EquippedCosmetics | null;
      } | null;
      error: { message: string } | null;
    }>);

  if (sErr || !student) return { success: false, error: 'Data siswa tidak ditemukan.' };

  const coins     = typeof student.coins === 'number' ? student.coins : 0;
  const totalXp   = typeof student.total_xp === 'number' ? student.total_xp : 0;
  const inventory = Array.isArray(student.inventory) ? student.inventory : [];

  // Check if already owned
  if (inventory.includes(item.id)) {
    return { success: false, error: 'Item kosmetik ini sudah kamu miliki!' };
  }

  // Level requirement check
  const levelInfo = calculateLevel(totalXp);
  if (levelInfo.currentLevel < item.minLevel) {
    return {
      success: false,
      error: `Level belum cukup! Butuh Level ${item.minLevel} (Levelmu: ${levelInfo.currentLevel}) ⭐`,
    };
  }

  // Coin balance check
  if (coins < item.price) {
    return {
      success: false,
      error: `Koin tidak cukup! Butuh ${item.price} 🪙 (Koinmu: ${coins} 🪙)`,
    };
  }

  const newCoins     = coins - item.price;
  const newInventory = [...inventory, item.id];

  const { error: upErr } = await (db
    .from('students')
    .update({
      coins: newCoins,
      inventory: newInventory,
    } as never)
    .eq('id', user.id) as unknown as Promise<{ error: { message: string } | null }>);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath('/student/dashboard', 'layout');
  return {
    success: true,
    message: `Selamat! Berhasil membeli ${item.name} 🎉`,
    coins: newCoins,
    inventory: newInventory,
  };
}

// ── equipCosmetic ───────────────────────────────────────────────────────────

export async function equipCosmetic(
  _prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { success: false, error: 'Tidak terautentikasi.' };

  const slot   = (formData.get('slot') as string | null)?.trim() as
    | 'hat'
    | 'outfit'
    | 'aura'
    | 'archetype'
    | 'pet'
    | 'petHat'
    | 'title'
    | null;
  const itemId = (formData.get('item_id') as string | null)?.trim() || null;

  if (!slot) return { success: false, error: 'Slot perlengkapan tidak valid.' };

  const db = createSupabaseAdminClient();

  const { data: student, error: sErr } = await (db
    .from('students')
    .select('inventory, equipped_hat_id, avatar_id, title_id, equipped_cosmetics')
    .eq('id', user.id)
    .maybeSingle() as unknown as Promise<{
      data: {
        inventory: string[] | null;
        equipped_hat_id: string | null;
        avatar_id: string | null;
        title_id: string | null;
        equipped_cosmetics?: EquippedCosmetics | null;
      } | null;
      error: { message: string } | null;
    }>);

  if (sErr || !student) return { success: false, error: 'Data siswa tidak ditemukan.' };

  const inventory = Array.isArray(student.inventory) ? student.inventory : [];

  // Verify ownership if equipping a non-empty item
  if (itemId) {
    const item = getAccessoryById(itemId);
    // Starter items (price 0) or archetype selections don't strictly require inventory entry
    const isStarterOrArchetype =
      item?.rarity === 'starter' ||
      item?.price === 0 ||
      slot === 'archetype' ||
      itemId === 'cyber-mage' ||
      itemId === 'astral-knight' ||
      itemId === 'shadow-glitcher' ||
      itemId === 'chrono-alchemist' ||
      itemId === 'cat' ||
      itemId === 'pet-cat';

    if (!isStarterOrArchetype && !inventory.includes(itemId)) {
      return { success: false, error: 'Kamu belum memiliki item ini di inventory.' };
    }
  }

  // Resolve current equipped cosmetics object
  const currentCosmetics: EquippedCosmetics = {
    archetype: student.equipped_cosmetics?.archetype || 'cyber-mage',
    skinTone:  student.equipped_cosmetics?.skinTone || 'default',
    hatId:     student.equipped_cosmetics?.hatId !== undefined ? student.equipped_cosmetics.hatId : student.equipped_hat_id,
    outfitId:  student.equipped_cosmetics?.outfitId || 'outfit-cyber-hoodie',
    auraId:    student.equipped_cosmetics?.auraId || null,
    petId:     student.equipped_cosmetics?.petId || 'cat',
    petHatId:  student.equipped_cosmetics?.petHatId || null,
    titleId:   student.equipped_cosmetics?.titleId !== undefined ? student.equipped_cosmetics.titleId : student.title_id,
  };

  // Mutate corresponding slot
  if (slot === 'hat')       currentCosmetics.hatId = itemId;
  if (slot === 'outfit')    currentCosmetics.outfitId = itemId || 'outfit-cyber-hoodie';
  if (slot === 'aura')      currentCosmetics.auraId = itemId;
  if (slot === 'archetype') currentCosmetics.archetype = itemId || 'cyber-mage';
  if (slot === 'pet')       currentCosmetics.petId = itemId ? itemId.replace('pet-', '') : 'cat';
  if (slot === 'petHat')    currentCosmetics.petHatId = itemId;
  if (slot === 'title')     currentCosmetics.titleId = itemId;

  // Prepare database updates (updating both JSONB and legacy columns)
  const updatePayload: Record<string, unknown> = {
    equipped_cosmetics: currentCosmetics,
  };

  if (slot === 'hat') {
    updatePayload.equipped_hat_id = itemId;
  }
  if (slot === 'title') {
    updatePayload.title_id = itemId;
  }
  if (slot === 'pet' || slot === 'archetype') {
    updatePayload.avatar_id = currentCosmetics.petId || currentCosmetics.archetype || null;
  }

  const { error: upErr } = await (db
    .from('students')
    .update(updatePayload as never)
    .eq('id', user.id) as unknown as Promise<{ error: { message: string } | null }>);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath('/student/dashboard', 'layout');
  return {
    success: true,
    message: itemId ? 'Perlengkapan berhasil dipasang! ✨' : 'Perlengkapan dilepas.',
    equippedCosmetics: currentCosmetics,
    equippedHatId: currentCosmetics.hatId ?? null,
  };
}

// ── Legacy aliases for backward compatibility ────────────────────────────────

export async function buyAccessory(
  prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  return buyCosmetic(prev, formData);
}

export async function equipAccessory(
  prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  // Map legacy equip calls (where slot is implicit hat)
  if (!formData.has('slot')) {
    formData.append('slot', 'hat');
  }
  return equipCosmetic(prev, formData);
}
