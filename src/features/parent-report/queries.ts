// src/features/parent-report/queries.ts
// Data access for the public parent report page.
// All reads use the admin client (server-only) — the page is token-gated,
// not session-gated, so we bypass RLS deliberately.
// This module never exposes any data unless the token is valid and unexpired.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Return shapes ─────────────────────────────────────────────────────────────

export interface CompletedSession {
  id: number;
  title: string;
  meeting_date: string;
  progress_report: string | null;
  completion_status: string | null;
}

export interface CompletedTopic {
  engine_topic_id: string;
  topic_title: string | null;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}

export interface ParentReportData {
  studentName: string;
  completedSessions: CompletedSession[];
  completedTopics: CompletedTopic[];
  totalSessions: number;
  totalTopics: number;
  totalXp: number;
}

// ── getParentReportData ───────────────────────────────────────────────────────

/**
 * Validates the token and returns the parent report payload.
 *
 * Returns null when:
 *   • The token does not exist in public.parent_links
 *   • expires_at is in the past
 *
 * Never throws — callers must handle null as "token invalid".
 */
export async function getParentReportData(
  token: string | undefined | null
): Promise<ParentReportData | null> {
  if (!token || token.trim().length === 0) return null;

  const db = createSupabaseAdminClient();

  // ── 1. Validate token ──────────────────────────────────────────────────────
  const { data: link, error: linkErr } = await (db
    .from('parent_links')
    .select('id, student_id, expires_at')
    .eq('token', token.trim())
    .maybeSingle() as unknown as Promise<{
      data: { id: string; student_id: string; expires_at: string } | null;
      error: { message: string } | null;
    }>);

  if (linkErr) {
    console.error('[getParentReportData] token lookup error:', linkErr.message);
    return null;
  }

  if (!link) return null; // token not found

  // Check expiry — compare against current UTC time
  if (new Date(link.expires_at) <= new Date()) return null; // expired

  const studentId = link.student_id;

  // ── 2. Fetch student name ──────────────────────────────────────────────────
  const { data: student } = await (db
    .from('students')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: { full_name: string } | null;
      error: unknown;
    }>);

  const studentName = student?.full_name ?? 'Siswa';

  // ── 3. Fetch completed meetings ────────────────────────────────────────────
  const { data: meetingStudents } = await (db
    .from('meeting_students')
    .select('meeting_id')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ meeting_id: number }>;
      error: unknown;
    }>);

  const meetingIds = (meetingStudents ?? []).map((ms) => ms.meeting_id);
  let completedSessions: CompletedSession[] = [];

  if (meetingIds.length > 0) {
    const { data: sessions } = await (db
      .from('meetings')
      .select('id, title, meeting_date, progress_report, completion_status')
      .in('id', meetingIds)
      .eq('is_completed', true)
      .order('meeting_date', { ascending: false }) as unknown as Promise<{
        data: CompletedSession[];
        error: unknown;
      }>);

    completedSessions = sessions ?? [];
  }

  // ── 4. Fetch completed engine topics ──────────────────────────────────────
  const { data: topicRows } = await (db
    .from('topic_progress')
    .select('engine_topic_id, xp_earned, best_quiz_score, completed_at, topics(title)')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false }) as unknown as Promise<{
      data: Array<{
        engine_topic_id: string;
        xp_earned: number;
        best_quiz_score: number;
        completed_at: string;
        topics: { title: string } | null;
      }>;
      error: unknown;
    }>);

  const completedTopics: CompletedTopic[] = (topicRows ?? []).map((t) => ({
    engine_topic_id: t.engine_topic_id,
    topic_title:     t.topics?.title ?? t.engine_topic_id,
    xp_earned:       t.xp_earned,
    best_quiz_score: t.best_quiz_score,
    completed_at:    t.completed_at,
  }));

  const totalXp = completedTopics.reduce((sum, t) => sum + t.xp_earned, 0);

  return {
    studentName,
    completedSessions,
    completedTopics,
    totalSessions: completedSessions.length,
    totalTopics:   completedTopics.length,
    totalXp,
  };
}
