// src/lib/auth.ts
// Reusable auth guard helpers for Server Actions, Route Handlers, Layouts, and Pages.
// Uses React.cache() so multiple calls within the same server render (e.g., Layout + Page)
// only execute a single Supabase auth.getUser() round-trip.

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';
import type { UserRole } from '@/types/roles';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true;  user: User; role: UserRole }
  | { ok: false; status: 401 | 403; message: string };

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

/**
 * Per-request memoized user fetch — prevents duplicate `supabase.auth.getUser()`
 * network calls when both a Layout and Page check the current user.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
});

/**
 * Returns the authenticated user and their role (memoized per request).
 * Returns a typed error object (never throws) if the session is missing or
 * the user has no recognised role.
 */
export const getAuthUser = cache(async (): Promise<AuthResult> => {
  const user = await getSessionUser();

  if (!user) {
    return { ok: false, status: 401, message: 'Sesi tidak ditemukan. Silakan login kembali.' };
  }

  let role: UserRole | undefined = isValidRole(user.user_metadata?.role)
    ? user.user_metadata.role
    : undefined;

  if (!role) {
    try {
      const cookieStore = await cookies();
      const cookieRole = cookieStore.get('b2b_role')?.value;
      if (isValidRole(cookieRole)) {
        role = cookieRole;
      }
    } catch {
      // ignore
    }
  }

  if (!role) {
    role = (await resolveUserRole(user.id, user)) ?? undefined;
  }

  if (!role) {
    return { ok: false, status: 403, message: 'Akun ini belum memiliki hak akses.' };
  }

  return { ok: true, user, role };
});

/**
 * Like getAuthUser() but additionally asserts the required role.
 * Returns a 403 error object if the authenticated user's role does not match.
 */
export async function requireRole(required: UserRole): Promise<AuthResult> {
  const result = await getAuthUser();
  if (!result.ok) return result;

  if (result.role !== required) {
    return {
      ok: false,
      status: 403,
      message: `Aksi ini memerlukan hak akses ${required}.`,
    };
  }

  return result;
}

/**
 * Convenience wrapper — asserts the user is an admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('admin');
}

/**
 * Like requireRole() but accepts any one of several allowed roles.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export async function requireAnyRole(allowed: UserRole[]): Promise<AuthResult> {
  const result = await getAuthUser();
  if (!result.ok) return result;

  if (!allowed.includes(result.role)) {
    return {
      ok: false,
      status: 403,
      message: `Aksi ini memerlukan hak akses ${allowed.join(' atau ')}.`,
    };
  }

  return result;
}

/**
 * Convenience wrapper — asserts the user is an admin or teacher.
 * Used by actions that both roles are permitted to perform (e.g. markSessionComplete).
 */
export async function requireAdminOrTeacher(): Promise<AuthResult> {
  return requireAnyRole(['admin', 'teacher']);
}
