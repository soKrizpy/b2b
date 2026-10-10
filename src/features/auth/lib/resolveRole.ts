// src/features/auth/lib/resolveRole.ts
// Resolves a user's role from the existing public.profiles table.
// Uses the service-role client so RLS never blocks this read.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/roles';

export async function resolveUserRole(userId: string): Promise<UserRole | null> {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle() as unknown as {
      data: { role: string } | null;
      error: { message: string } | null;
    };

  if (error) {
    console.error('[resolveUserRole] DB error:', error.message);
    return null;
  }

  if (!data?.role) {
    return null;
  }

  const role = data.role;
  if (role === 'admin' || role === 'teacher' || role === 'student') {
    return role;
  }

  return null;
}
