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
 * Meetings assigned to a specific teacher (teacher_id = teacherId).
 * Uses the admin client so RLS doesn't interfere with the filter.
 * teacher_id was added in migration 0007.
 */
export async function getSessionsForTeacher(
  teacherId: string
): Promise<MeetingWithStudents[]> {
  const db = createSupabaseAdminClient();
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



// ── Town Square enriched meeting ─────────────────────────────────────────────

export interface TownSquareSeat {
  student_id:      string;
  full_name:       string;
  avatar_id:       string | null;
  equipped_hat_id: string | null;
  total_xp:        number;
  is_self:         boolean;
}

export interface TownSquareMeeting {
  id: number;
  title: string;
  meeting_date: string;
  link_url: string | null;
  notes: string | null;
  session_count: number;
  session_number: number;
  teacher_id: string | null;
  teacher_name: string | null;
  seats: TownSquareSeat[];   // max 4 enrolled students
}

/**
 * Returns the next upcoming (non-completed) meeting for a student, enriched
 * with teacher name (from profiles) and all enrolled classmate names+avatars.
 * Returns null if no upcoming meeting exists.
 */
export async function getUpcomingMeetingForStudent(
  studentId: string
): Promise<TownSquareMeeting | null> {
  const db  = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // 1. Find the next upcoming meeting where this student is enrolled
  const { data: meetings, error: meetErr } = await (db
    .from('meetings')
    .select(`
      id, title, meeting_date, link_url, notes,
      session_count, session_number, teacher_id,
      meeting_students!inner (
        student_id,
        students ( id, full_name, avatar_id )
      )
    `)
    .eq('is_completed', false)
    .eq('meeting_students.student_id', studentId)
    .gt('meeting_date', now)
    .order('meeting_date', { ascending: true })
    .limit(1) as unknown as Promise<{
      data: Array<{
        id: number;
        title: string;
        meeting_date: string;
        link_url: string | null;
        notes: string | null;
        session_count: number;
        session_number: number;
        teacher_id: string | null;
        meeting_students: Array<{
          student_id: string;
          students: { id: string; full_name: string; avatar_id: string | null } | null;
        }>;
      }> | null;
      error: { message: string } | null;
    }>);

  // Also check for live meetings (meeting_date <= now, not completed)
  const { data: liveMeetings, error: liveErr } = await (db
    .from('meetings')
    .select(`
      id, title, meeting_date, link_url, notes,
      session_count, session_number, teacher_id,
      meeting_students!inner (
        student_id,
        students ( id, full_name, avatar_id )
      )
    `)
    .eq('is_completed', false)
    .eq('meeting_students.student_id', studentId)
    .lte('meeting_date', now)
    .order('meeting_date', { ascending: false })
    .limit(1) as unknown as Promise<{
      data: Array<{
        id: number;
        title: string;
        meeting_date: string;
        link_url: string | null;
        notes: string | null;
        session_count: number;
        session_number: number;
        teacher_id: string | null;
        meeting_students: Array<{
          student_id: string;
          students: { id: string; full_name: string; avatar_id: string | null } | null;
        }>;
      }> | null;
      error: { message: string } | null;
    }>);

  if (meetErr)  console.error('[getUpcomingMeetingForStudent] meetings:', meetErr.message);
  if (liveErr)  console.error('[getUpcomingMeetingForStudent] live:', liveErr.message);

  // Prefer live meeting, then upcoming
  const raw = (liveMeetings?.[0]) ?? (meetings?.[0]) ?? null;
  if (!raw) return null;

  // 2. Fetch all enrolled students for THIS meeting (not just inner-joined on current student)
  const { data: allSeats } = await (db
    .from('meeting_students')
    .select('student_id, students ( id, full_name, avatar_id, equipped_hat_id, total_xp )')
    .eq('meeting_id', raw.id) as unknown as Promise<{
      data: Array<{
        student_id: string;
        students: {
          id: string;
          full_name: string;
          avatar_id:       string | null;
          equipped_hat_id: string | null;
          total_xp:        number;
        } | null;
      }> | null;
      error: unknown;
    }>);

  // 3. Fetch teacher name from profiles (if teacher_id set)
  let teacherName: string | null = null;
  if (raw.teacher_id) {
    const { data: profile } = await (db
      .from('profiles')
      .select('full_name')
      .eq('id', raw.teacher_id)
      .maybeSingle() as unknown as Promise<{
        data: { full_name: string | null } | null;
        error: unknown;
      }>);
    teacherName = profile?.full_name ?? null;
  }

  // 4. Build seats array (max 4)
  const seats: TownSquareSeat[] = (allSeats ?? [])
    .slice(0, 4)
    .map((ms) => ({
      student_id:      ms.student_id,
      full_name:       ms.students?.full_name       ?? 'Siswa',
      avatar_id:       ms.students?.avatar_id       ?? null,
      equipped_hat_id: ms.students?.equipped_hat_id ?? null,
      total_xp:        ms.students?.total_xp        ?? 0,
      is_self:         ms.student_id === studentId,
    }));

  return {
    id:             raw.id,
    title:          raw.title,
    meeting_date:   raw.meeting_date,
    link_url:       raw.link_url,
    notes:          raw.notes,
    session_count:  raw.session_count,
    session_number: raw.session_number,
    teacher_id:     raw.teacher_id,
    teacher_name:   teacherName,
    seats,
  };
}
