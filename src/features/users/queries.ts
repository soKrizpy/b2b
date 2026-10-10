// src/features/users/queries.ts
// Read-side helpers for the admin user management page.
// All queries use the admin client (bypasses RLS).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface AssignedModule {
  module_id: number;
  title:     string;
  status:    string;
  level:     string | null;
}

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
  /** Active module titles (for badge list in table row) */
  module_titles:  string[];
  /** All assigned modules with detail (for detail modal) */
  modules:        AssignedModule[];
  /** Attended meeting count */
  session_count:  number;
  /** Quiz attempt count */
  quiz_count:     number;
  /** Certificate count */
  cert_count:     number;
}

export interface TeacherRecord {
  id:         string;
  full_name:  string | null;
  email:      string | null;
  created_at: string | null;
  /** Meetings assigned to this teacher */
  session_count: number;
  /** Unique students enrolled in this teacher's meetings */
  student_count: number;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All students, newest first, enriched with modules + stats. */
export async function getAllStudents(): Promise<StudentRecord[]> {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('students')
    .select(`
      id, full_name, email_or_phone, grade, bio, mpin,
      total_xp, coins, created_at,
      student_modules (
        status,
        modules ( id, title, level )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllStudents]', error.message);
    return [];
  }

  // Fetch meeting attendance counts in one batch
  const { data: meetingStudents } = await db
    .from('meeting_students')
    .select('student_id, has_joined') as unknown as {
      data: Array<{ student_id: string; has_joined: boolean }> | null;
      error: unknown;
    };

  // Fetch quiz attempt counts
  const { data: quizAttempts } = await db
    .from('quiz_attempts')
    .select('student_id');

  // Fetch certificate counts
  const { data: certs } = await db
    .from('certificates')
    .select('student_id');

  // Build lookup maps
  const sessionMap = new Map<string, number>();
  (meetingStudents ?? []).forEach((ms) => {
    if (ms.has_joined) {
      sessionMap.set(ms.student_id, (sessionMap.get(ms.student_id) ?? 0) + 1);
    }
  });

  const quizMap = new Map<string, number>();
  (quizAttempts ?? []).forEach((qa) => {
    const sid = (qa as { student_id: string }).student_id;
    quizMap.set(sid, (quizMap.get(sid) ?? 0) + 1);
  });

  const certMap = new Map<string, number>();
  (certs ?? []).forEach((c) => {
    const sid = (c as { student_id: string }).student_id;
    certMap.set(sid, (certMap.get(sid) ?? 0) + 1);
  });

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
        modules: { id: number; title: string; level: string | null } | null;
      }>;
    };

    const modules: AssignedModule[] = (r.student_modules ?? [])
      .filter((sm) => sm.modules != null)
      .map((sm) => ({
        module_id: sm.modules!.id,
        title:     sm.modules!.title,
        status:    sm.status,
        level:     sm.modules!.level,
      }));

    const module_titles = modules
      .filter((m) => m.status === 'active')
      .map((m) => m.title);

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
      modules,
      session_count:  sessionMap.get(r.id) ?? 0,
      quiz_count:     quizMap.get(r.id)    ?? 0,
      cert_count:     certMap.get(r.id)    ?? 0,
    };
  });
}

/** All teachers (from public.profiles where role = 'teacher'), enriched with email + session count. */
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

  // Count sessions assigned per teacher
  const { data: meetings } = await db
    .from('meetings')
    .select('id, teacher_id');

  const sessionMap = new Map<string, number>();
  const teacherMeetingIds = new Map<string, number[]>();
  (meetings ?? []).forEach((m) => {
    const row = m as { id: number; teacher_id: string | null };
    if (row.teacher_id) {
      sessionMap.set(row.teacher_id, (sessionMap.get(row.teacher_id) ?? 0) + 1);
      const arr = teacherMeetingIds.get(row.teacher_id) ?? [];
      arr.push(row.id);
      teacherMeetingIds.set(row.teacher_id, arr);
    }
  });

  // Count unique students per teacher via meeting_students
  const { data: mStudents } = await db
    .from('meeting_students')
    .select('meeting_id, student_id');

  const studentCountMap = new Map<string, Set<string>>();
  (mStudents ?? []).forEach((ms) => {
    const row = ms as { meeting_id: number; student_id: string };
    for (const [tid, mids] of teacherMeetingIds) {
      if (mids.includes(row.meeting_id)) {
        const s = studentCountMap.get(tid) ?? new Set<string>();
        s.add(row.student_id);
        studentCountMap.set(tid, s);
      }
    }
  });

  return (profiles ?? []).map((p: unknown) => {
    const row = p as { id: string; full_name: string | null; created_at: string | null };
    return {
      id:            row.id,
      full_name:     row.full_name,
      email:         emailMap.get(row.id) ?? null,
      created_at:    row.created_at,
      session_count: sessionMap.get(row.id) ?? 0,
      student_count: studentCountMap.get(row.id)?.size ?? 0,
    };
  });
}
