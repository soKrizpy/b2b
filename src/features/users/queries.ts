// src/features/users/queries.ts
// Read-side helpers for the admin user management page.
// All queries use the admin client (bypasses RLS).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface StudentRecord {
  id:             string;
  full_name:      string;
  email_or_phone: string;
  grade:          string | null;
  bio:            string | null;
  mpin:           string;
  total_xp:       number;
  coins:          number;
  created_at:     string | null;
  /** Active module titles (from student_modules join) */
  module_titles:  string[];
}

export interface TeacherRecord {
  id:        string;
  full_name: string | null;
  email:     string | null;
  created_at: string | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All students, newest first, enriched with active module titles. */
export async function getAllStudents(): Promise<StudentRecord[]> {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('students')
    .select(`
      id, full_name, email_or_phone, grade, bio, mpin,
      total_xp, coins, created_at,
      student_modules (
        status,
        modules ( title )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllStudents]', error.message);
    return [];
  }

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string;
      full_name: string;
      email_or_phone: string;
      grade: string | null;
      bio: string | null;
      mpin: string;
      total_xp: number;
      coins: number;
      created_at: string | null;
      student_modules: Array<{
        status: string;
        modules: { title: string } | null;
      }>;
    };

    const module_titles = (r.student_modules ?? [])
      .filter((sm) => sm.status === 'active')
      .map((sm) => sm.modules?.title ?? '')
      .filter(Boolean);

    return {
      id:             r.id,
      full_name:      r.full_name,
      email_or_phone: r.email_or_phone,
      grade:          r.grade,
      bio:            r.bio,
      mpin:           r.mpin,
      total_xp:       r.total_xp ?? 0,
      coins:          r.coins    ?? 0,
      created_at:     r.created_at,
      module_titles,
    };
  });
}

/** All teachers (from public.profiles where role = 'teacher'), enriched with email. */
export async function getAllTeachers(): Promise<TeacherRecord[]> {
  const db = createSupabaseAdminClient();

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[getAllTeachers]', error.message);
    return [];
  }

  // Enrich with auth emails in one batch
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? ''])
  );

  return (profiles ?? []).map((p: unknown) => {
    const row = p as { id: string; full_name: string | null; created_at: string | null };
    return {
      id:         row.id,
      full_name:  row.full_name,
      email:      emailMap.get(row.id) ?? null,
      created_at: row.created_at,
    };
  });
}
