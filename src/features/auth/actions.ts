// src/features/auth/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { resolveUserRole } from './lib/resolveRole';
import { ROLE_DASHBOARD_MAP, PROTECTED_PREFIXES } from '@/lib/constants';
import { signInSchema, isPhoneNumber, phoneToEmail } from './validation';
import type { SignInInput } from './validation';

export type SignInResult =
  | { success: true;  redirectTo: string }
  | { success: false; error: string; fields?: Partial<Record<keyof SignInInput, string>> };

function isSafeRedirect(path: string, role: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const requiredRole = Object.entries(PROTECTED_PREFIXES).find(
    ([prefix]) => path.startsWith(prefix)
  )?.[1];
  return requiredRole === role;
}

export async function signIn(
  _prevState: SignInResult | null,
  formData: FormData
): Promise<SignInResult> {
  // 1. Validate
  const raw = {
    identifier: formData.get('identifier'),
    password:   formData.get('password'),
    redirectTo: formData.get('redirectTo'),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: 'Mohon periksa kembali isian formulir.',
      fields: {
        ...(flat.fieldErrors.identifier?.[0] && { identifier: flat.fieldErrors.identifier[0] }),
        ...(flat.fieldErrors.password?.[0]   && { password:   flat.fieldErrors.password[0] }),
      },
    };
  }

  const { identifier, password, redirectTo } = parsed.data;

  // 2. Resolve email -- phone numbers use the synthetic email pattern
  //    {phone}@student.mylms.app  (set during student account creation)
  const email = isPhoneNumber(identifier)
    ? phoneToEmail(identifier)
    : identifier;

  // 3. Authenticate
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.',
    };
  }

  const user = authData.user;

  // 4. Resolve role
  const role = await resolveUserRole(user.id);

  if (!role) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Akun ini belum dikonfigurasi. Hubungi administrator.',
    };
  }

  // 5. Stamp role into user_metadata for JWT-based middleware RBAC
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role },
    });
  } catch (err) {
    console.error('[signIn] failed to stamp user_metadata.role:', err);
  }

  // 6. Redirect
  const destination = isSafeRedirect(redirectTo ?? '', role)
    ? redirectTo!
    : ROLE_DASHBOARD_MAP[role];

  redirect(destination);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
