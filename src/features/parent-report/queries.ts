// src/features/parent-report/queries.ts
// Data access for the public parent report page.
// All reads use the admin client (server-only) — the page is token-gated,
// not session-gated, so we bypass RLS deliberately.
// This module never exposes any data unless the token is valid and unexpired.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStudentCertificates, type CertificateWithModule } from '@/features/certificates/queries';

// ── Return shapes ─────────────────────────────────────────────────────────────

export interface SessionItem {
  id: number;
  title: string;
  meeting_date: string;
  progress_report: string | null;
  completion_status: string | null;
  /** Whether the student actually joined this session (from meeting_students.has_joined). */
  has_joined: boolean;
}

export interface CompletedTopic {
  engine_topic_id: string;
  topic_title: string | null;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}

/** Billing snapshot attached to this report link (if admin linked an invoice). */
export interface InvoiceSummary {
  month_year: string;
  total_meetings: number;
  attended_meetings: number;
  price_per_meeting: number;
  total_amount: number;
  bank_account: string | null;
  status: 'draft' | 'sent' | 'paid';
}

export interface ParentReportData {
  studentName: string;
  /** All completed sessions, sorted newest first. */
  completedSessions: SessionItem[];
  completedTopics: CompletedTopic[];
  totalSessions: number;
  totalTopics: number;
  totalXp: number;
  /** Attended sessions (has_joined = true) across ALL the student's sessions. */
  attendedCount: number;
  /** Invoice linked to this report, or null if the admin hasn't attached one. */
  invoice: InvoiceSummary | null;
  certificates: CertificateWithModule[];
}

// ── getParentReportData ───────────────────────────────────────────────────────

export async function getParentReportData(
  token: string | undefined | null
): Promise<ParentReportData | null> {
  if (!token || token.trim().length === 0) return null;

  const db = createSupabaseAdminClient();

  // ── 1. Validate token ──────────────────────────────────────────────────────
  const { data: link, error: linkErr } = await (db
    .from('parent_links')
    .select('id, student_id, expires_at, invoice_id')
    .eq('token', token.trim())
    .maybeSingle() as unknown as Promise<{
      data: {
        id: string;
        student_id: string;
        expires_at: string;
        invoice_id: string | null;
      } | null;
      error: { message: string } | null;
    }>);

  if (linkErr) {
    console.error('[getParentReportData] token lookup error:', linkErr.message);
    return null;
  }
  if (!link) return null;
  if (new Date(link.expires_at) <= new Date()) return null;

  const studentId = link.student_id;

  // ── 2. Student name ────────────────────────────────────────────────────────
  const { data: student } = await (db
    .from('students')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: { full_name: string } | null;
      error: unknown;
    }>);

  const studentName = student?.full_name ?? 'Siswa';

  // ── 3. All meetings for this student with attendance status ────────────────
  // We fetch via meeting_students so we get has_joined per session.
  // is_completed filters to teacher-confirmed finished sessions for display;
  // has_joined drives the attendance count for billing.
  const { data: msRows } = await (db
    .from('meeting_students')
    .select('meeting_id, has_joined')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ meeting_id: number; has_joined: boolean }>;
      error: unknown;
    }>);

  const allRows  = msRows ?? [];
  const meetingIds = allRows.map((ms) => ms.meeting_id);

  // Build a quick lookup: meetingId → has_joined
  const hasJoinedMap = new Map<number, boolean>(
    allRows.map((ms) => [ms.meeting_id, ms.has_joined])
  );

  // Attended count (used for billing verification — mirrors production logic)
  const attendedCount = allRows.filter((ms) => ms.has_joined).length;

  // ── 4. Completed sessions (display list) ──────────────────────────────────
  let completedSessions: SessionItem[] = [];

  if (meetingIds.length > 0) {
    const { data: sessions } = await (db
      .from('meetings')
      .select('id, title, meeting_date, progress_report, completion_status')
      .in('id', meetingIds)
      .eq('is_completed', true)
      .order('meeting_date', { ascending: false }) as unknown as Promise<{
        data: Array<{
          id: number;
          title: string;
          meeting_date: string;
          progress_report: string | null;
          completion_status: string | null;
        }>;
        error: unknown;
      }>);

    completedSessions = (sessions ?? []).map((s) => ({
      ...s,
      has_joined: hasJoinedMap.get(s.id) ?? false,
    }));
  }

  // ── 5. Engine topic progress ───────────────────────────────────────────────
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

  // ── 6. Invoice (if the admin linked one to this report) ────────────────────
  let invoice: InvoiceSummary | null = null;

  if (link.invoice_id) {
    const { data: inv } = await (db
      .from('invoices')
      .select(
        'month_year, total_meetings, attended_meetings, price_per_meeting, total_amount, bank_account, status'
      )
      .eq('id', link.invoice_id)
      .maybeSingle() as unknown as Promise<{
        data: InvoiceSummary | null;
        error: unknown;
      }>);

    invoice = inv ?? null;
  }

  const certificates = await getStudentCertificates(studentId);

  return {
    studentName,
    completedSessions,
    completedTopics,
    totalSessions: completedSessions.length,
    totalTopics:   completedTopics.length,
    totalXp,
    attendedCount,
    invoice,
    certificates,
  };
}

