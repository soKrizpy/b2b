// src/features/auth/lib/resolveRole.ts
// Resolves a user's role from public.profiles, with fallbacks to the
// authenticated server client, user_metadata.role, and automatic profile
// provisioning when a user was created directly in Supabase Auth Dashboard.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/roles';

interface AuthUserLike {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

export async function resolveUserRole(
  userId: string,
  user?: AuthUserLike | null
): Promise<UserRole | null> {
  if (!userId) return null;

  // 1. Try reading from public.profiles using admin client (service role)
  const adminDb = createSupabaseAdminClient();
  const { data: adminProfile, error: adminErr } = (await adminDb
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()) as unknown as {
    data: { role: string } | null;
    error: { message: string } | null;
  };

  if (!adminErr && isValidRole(adminProfile?.role)) {
    return adminProfile.role;
  }

  // 2. Fallback: read from public.profiles using the user's authenticated session
  //    (handles cases where SUPABASE_SERVICE_ROLE_KEY is not set and RLS checks auth.uid() = id)
  try {
    const serverDb = await createSupabaseServerClient();
    const { data: userProfile } = (await serverDb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()) as unknown as {
      data: { role: string } | null;
      error: { message: string } | null;
    };

    if (isValidRole(userProfile?.role)) {
      return userProfile.role;
    }
  } catch {
    // ignore
  }

  // 3. Check user_metadata or app_metadata if present
  const metaRole = user?.user_metadata?.role ?? user?.app_metadata?.role;
  let inferredRole: UserRole | null = isValidRole(metaRole) ? metaRole : null;

  // 4. If user was created directly in Supabase Auth Dashboard without a profile row or metadata,
  //    infer role from email convention (or default to 'admin' for manual Supabase Auth accounts)
  if (!inferredRole && user) {
    const email = (user.email ?? '').toLowerCase();
    if (email.endsWith('@student.mylms.app') || email.startsWith('student') || email.startsWith('siswa')) {
      inferredRole = 'student';
    } else if (email.startsWith('guru') || email.startsWith('teacher')) {
      inferredRole = 'teacher';
    } else {
      inferredRole = 'admin';
    }
  }

  // 5. Auto-provision public.profiles row so future lookups succeed immediately
  if (inferredRole) {
    const fullName =
      (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (user?.email ? user.email.split('@')[0] : 'Pengguna');

    try {
      await (adminDb
        .from('profiles')
        .upsert({ id: userId, role: inferredRole, full_name: fullName } as never, { onConflict: 'id' }) as unknown as Promise<unknown>);
    } catch {
      // ignore if RLS blocks without service role key
    }
  }

  return inferredRole;
}
