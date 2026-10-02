// src/features/users/actions.ts
// Admin Server Actions: create/delete students and teachers.
// Mirrors the proven 3-step flow from the existing bits2bytes-lms:
//   1. auth.admin.createUser  — creates the Supabase Auth user
//   2. INSERT public.profiles — stores the role
//   3. INSERT public.students (or nothing extra for teachers)
//   4. Rollback auth user on any failure
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Return type ───────────────────────────────────────────────────────────────

export type UserActionResult =
  | { success: true;  message: string; userId?: string }
  | { success: false; error: string; fields?: Record<string, string> };

// ── Schemas ───────────────────────────────────────────────────────────────────

// Student: identifies by WhatsApp/phone or email + 6-digit PIN
const createStudentSchema = z.object({
  full_name:      z.string().min(2,  'Nama lengkap minimal 2 karakter').max(100),
  contact:        z.string().min(6,  'Email atau nomor WhatsApp wajib diisi'),
  mpin:           z.string().length(6, 'MPIN harus tepat 6 digit').regex(/^\d{6}$/, 'MPIN harus 6 angka'),
  grade:          z.string().max(20).optional(),
  bio:            z.string().max(500).optional(),
});

// Teacher: identifies by email + regular password
const createTeacherSchema = z.object({
  full_name: z.string().min(2,  'Nama lengkap minimal 2 karakter').max(100),
  email:     z.email('Format email tidak valid'),
  password:  z.string().min(8,  'Password minimal 8 karakter'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatErr(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(err.flatten().fieldErrors)) {
    if (Array.isArray(msgs) && msgs.length) out[k] = msgs[0] as string;
  }
  return out;
}

const REVALIDATE = ['/admin/users', '/admin/dashboard'];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p, 'layout'));
}

// ── createStudent ─────────────────────────────────────────────────────────────

export async function createStudent(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = {
    full_name: formData.get('full_name'),
    contact:   formData.get('contact'),
    mpin:      formData.get('mpin'),
    grade:     formData.get('grade')  || undefined,
    bio:       formData.get('bio')    || undefined,
  };

  const parsed = createStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Periksa kembali isian formulir.', fields: flatErr(parsed.error) };
  }

  const { full_name, contact, mpin, grade, bio } = parsed.data;

  // Phone numbers get a synthetic email — matches existing production convention
  const email = contact.includes('@')
    ? contact.trim()
    : `${contact.trim()}@student.mylms.app`;

  const db = createSupabaseAdminClient();

  // 1. Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password: mpin,
    email_confirm: true,
    user_metadata: { full_name, role: 'student' },
  });

  if (authErr || !authData?.user) {
    const msg = authErr?.message?.includes('already been registered')
      ? 'Kontak ini sudah terdaftar.'
      : (authErr?.message ?? 'Gagal membuat akun.');
    return { success: false, error: msg };
  }

  const userId = authData.user.id;

  // 2. Insert public.profiles
  const { error: profileErr } = await (db
    .from('profiles')
    .insert({ id: userId, role: 'student', full_name } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (profileErr) {
    await db.auth.admin.deleteUser(userId);
    return { success: false, error: `Profile error: ${profileErr.message}` };
  }

  // 3. Insert public.students
  const { error: studentErr } = await (db
    .from('students')
    .insert({
      id:             userId,
      email_or_phone: contact.trim(),
      full_name,
      grade:          grade  ?? null,
      bio:            bio    ?? null,
      mpin,
    } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (studentErr) {
    await db.auth.admin.deleteUser(userId);
    return { success: false, error: `DB error: ${studentErr.message}` };
  }

  revalidateAll();
  return { success: true, message: `Siswa "${full_name}" berhasil ditambahkan.`, userId };
}

// ── createTeacher ─────────────────────────────────────────────────────────────

export async function createTeacher(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = {
    full_name: formData.get('full_name'),
    email:     formData.get('email'),
    password:  formData.get('password'),
  };

  const parsed = createTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Periksa kembali isian formulir.', fields: flatErr(parsed.error) };
  }

  const { full_name, email, password } = parsed.data;

  const db = createSupabaseAdminClient();

  // 1. Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'teacher' },
  });

  if (authErr || !authData?.user) {
    const msg = authErr?.message?.includes('already been registered')
      ? 'Email ini sudah terdaftar.'
      : (authErr?.message ?? 'Gagal membuat akun.');
    return { success: false, error: msg };
  }

  const userId = authData.user.id;

  // 2. Insert public.profiles (teachers only need profiles — no teachers table)
  const { error: profileErr } = await (db
    .from('profiles')
    .insert({ id: userId, role: 'teacher', full_name } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (profileErr) {
    await db.auth.admin.deleteUser(userId);
    return { success: false, error: `Profile error: ${profileErr.message}` };
  }

  revalidateAll();
  return { success: true, message: `Guru "${full_name}" berhasil ditambahkan.`, userId };
}

// ── deleteUser ────────────────────────────────────────────────────────────────

export async function deleteUser(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const userId = formData.get('userId') as string | null;
  const role   = formData.get('role')   as string | null;
  if (!userId) return { success: false, error: 'User ID tidak ditemukan.' };

  const db = createSupabaseAdminClient();

  // Clean up role-specific tables before deleting auth user
  if (role === 'student') {
    await (db.from('student_modules').delete().eq('student_id', userId) as unknown as Promise<unknown>);
    await (db.from('students').delete().eq('id', userId)                as unknown as Promise<unknown>);
  }

  await (db.from('profiles').delete().eq('id', userId) as unknown as Promise<unknown>);

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };

  revalidateAll();
  return { success: true, message: 'Akun berhasil dihapus.' };
}
