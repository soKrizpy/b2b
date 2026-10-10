'use server';
// src/features/pet/actions/shopActions.ts
// Server Actions for the avatar accessory shop (wardrobe).
// Auth-gated via session — student only.

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccessoryById } from '@/features/pet/lib/avatarShopCatalog';

export type ShopActionResult =
  | { success: true;  message: string; coins?: number; inventory?: string[]; equippedHatId?: string | null }
  | { success: false; error: string };

// ── buyAccessory ──────────────────────────────────────────────────────────────

export async function buyAccessory(
  _prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { success: false, error: 'Tidak terautentikasi.' };

  const itemId = (formData.get('item_id') as string | null)?.trim();
  const item   = getAccessoryById(itemId);
  if (!item) return { success: false, error: 'Aksesori tidak ditemukan.' };

  const db = createSupabaseAdminClient();

  const { data: student, error: sErr } = await (db
    .from('students')
    .select('coins, inventory')
    .eq('id', user.id)
    .maybeSingle() as unknown as Promise<{
      data: { coins: number; inventory: string[] } | null;
      error: { message: string } | null;
    }>);

  if (sErr || !student) return { success: false, error: 'Data siswa tidak ditemukan.' };

  const coins     = typeof student.coins === 'number' ? student.coins : 0;
  const inventory: string[] = Array.isArray(student.inventory) ? student.inventory : [];

  if (inventory.includes(item.id)) return { success: false, error: 'Aksesori ini sudah kamu miliki!' };
  if (coins < item.price)          return { success: false, error: `Koin tidak cukup. Butuh ${item.price} 🪙.` };

  const newCoins     = coins - item.price;
  const newInventory = [...inventory, item.id];

  const { error: upErr } = await (db
    .from('students')
    .update({ coins: newCoins, inventory: newInventory } as never)
    .eq('id', user.id) as unknown as Promise<{ error: { message: string } | null }>);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath('/student/dashboard', 'layout');
  return {
    success: true,
    message: `Berhasil membeli ${item.name}! 🎉`,
    coins: newCoins,
    inventory: newInventory,
  };
}

// ── equipAccessory ────────────────────────────────────────────────────────────
// Pass itemId = '' to unequip.

export async function equipAccessory(
  _prev: ShopActionResult | null,
  formData: FormData
): Promise<ShopActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { success: false, error: 'Tidak terautentikasi.' };

  const itemId = (formData.get('item_id') as string | null) ?? '';
  const equip  = itemId.trim() !== '';                // empty = unequip

  const db = createSupabaseAdminClient();

  // Verify ownership before equip
  if (equip) {
    const { data: student } = await (db
      .from('students')
      .select('inventory')
      .eq('id', user.id)
      .maybeSingle() as unknown as Promise<{
        data: { inventory: string[] } | null;
        error: unknown;
      }>);

    const inventory: string[] = Array.isArray(student?.inventory) ? student!.inventory : [];
    if (!inventory.includes(itemId)) {
      return { success: false, error: 'Kamu belum memiliki aksesori ini.' };
    }
  }

  const { error: upErr } = await (db
    .from('students')
    .update({ equipped_hat_id: equip ? itemId : null } as never)
    .eq('id', user.id) as unknown as Promise<{ error: { message: string } | null }>);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath('/student/dashboard', 'layout');
  return {
    success: true,
    message: equip ? 'Aksesori dipasang! ✨' : 'Aksesori dilepas.',
    equippedHatId: equip ? itemId : null,
  };
}
