// src/features/sessions/queries.ts
// Typed data query helpers for fetching meetings, teachers, and students.
// All helpers that need to bypass RLS use the admin client (server-only).

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { MeetingRow, StudentRow } from '@/types/database';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface MeetingWithStudents extends MeetingRow {
  meeting_students: Array<{
    student_id: string;
    has_joined: boolean;
    students: Pick<StudentRow, 'id' | 'full_name' | 'email_or_phone'> | null;
  }>;
}

export interface TeacherOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface StudentOption {
  id: string;
  full_name: string;
  email_or_phone: string;
  grade: string | null;
}

// ── Query helpers shared between cookie client and admin client ───────────────

const MEETING_SELECT = `
  id, title, meeting_date, link_url, notes,
  session_count, session_number, series_id,
  is_completed, completion_status, progress_report, created_at,
  meeting_students (
    student_id,
    has_joined,
    students ( id, full_name, email_or_phone )
  )
`.trim();

const MEETING_SELECT_INNER = `
  id, title, meeting_date, link_url, notes,
  session_count, session_number, series_id,
  is_completed, completion_status, progress_report, created_at,
  meeting_students!inner (
    student_id,
    has_joined,
    students ( id, full_name, email_or_phone )
  )
`.trim();

// ── Meetings ─────────────────────────────────────────────────────────────────

/**
 * All meetings sorted ascending by meeting_date.
 * Admin-only — bypasses RLS via the admin client.
 */
export async function getSessionsForAdmin(): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForAdmin]', error.message);
    return [];
  }
  return (data ?? []) as unknown as MeetingWithStudents[];
}

/**
 * Meetings for a specific teacher, sorted ascending.
 * Uses the server (cookie) client — RLS applies on top of the eq filter.
 */
export async function getSessionsForTeacher(
  teacherId: string
): Promise<MeetingWithStudents[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('teacher_id', teacherId)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForTeacher]', error.message);
    return [];
  }
  return (data ?? []) as unknown as MeetingWithStudents[];
}

/**
 * Meetings where the given student appears in meeting_students, sorted ascending.
 */
export async function getSessionsForStudent(
  studentId: string
): Promise<MeetingWithStudents[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT_INNER)
    .eq('meeting_students.student_id', studentId)
    .order('meeting_date', { ascending: true });

  if (error) {
    console.error('[getSessionsForStudent]', error.message);
    return [];
  }
  return (data ?? []) as unknown as MeetingWithStudents[];
}

/**
 * Single meeting by ID with its student list.
 */
export async function getSessionById(
  id: number
): Promise<MeetingWithStudents | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[getSessionById]', error.message);
    return null;
  }
  return data as unknown as MeetingWithStudents | null;
}

// ── Teachers ─────────────────────────────────────────────────────────────────

/**
 * All teachers as { id, full_name, email } — for admin select dropdowns.
 * Reads profiles table for full_name, enriches with email from auth.admin.
 */
export async function getTeacherOptions(): Promise<TeacherOption[]> {
  const db = createSupabaseAdminClient();

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[getTeacherOptions] profiles error:', error.message);
    return [];
  }

  // Enrich with emails from auth.users — one batch call
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? ''])
  );

  return (profiles ?? []).map((p) => {
    // Cast each profile row explicitly to avoid the Database generic inferring 'never'
    const row = p as unknown as { id: string; full_name: string | null };
    return {
      id:         row.id,
      full_name:  row.full_name,
      email:      emailMap.get(row.id) ?? null,
    };
  });
}

// ── Students ─────────────────────────────────────────────────────────────────

/**
 * All students as { id, full_name, email_or_phone, grade } — for admin dropdowns.
 */
export async function getStudentOptions(): Promise<StudentOption[]> {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('students')
    .select('id, full_name, email_or_phone, grade')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[getStudentOptions]', error.message);
    return [];
  }

  return (data ?? []) as unknown as StudentOption[];
}

/**
 * Paginated student list with total count.
 * Used by the Admin student management page.
 */
export async function getStudentsWithModules(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<{ students: StudentOption[]; total: number }> {
  const db = createSupabaseAdminClient();
  const page     = opts?.page     ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  const { data, error, count } = await db
    .from('students')
    .select('id, full_name, email_or_phone, grade', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[getStudentsWithModules]', error.message);
    return { students: [], total: 0 };
  }

  return {
    students: (data ?? []) as unknown as StudentOption[],
    total:    count ?? 0,
  };
}
