// src/lib/auth.ts
// Reusable auth guard helpers for Server Actions and Route Handlers.
// All helpers are server-only by virtue of using the server Supabase client.

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/roles';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true;  user: User; role: UserRole }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Returns the authenticated user and their role.
 * Returns a typed error object (never throws) if the session is missing or
 * the user has no recognised role.
 *
 * Designed for use inside Server Actions and Route Handlers.
 */
export async function getAuthUser(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: 'Sesi tidak ditemukan. Silakan login kembali.' };
  }

  const role = user.user_metadata?.role as UserRole | undefined;

  if (!role || !['admin', 'teacher', 'student'].includes(role)) {
    return { ok: false, status: 403, message: 'Akun ini belum memiliki hak akses.' };
  }

  return { ok: true, user, role };
}

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
