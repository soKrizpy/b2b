// src/features/parent-report/queries.student.ts
// Data access for the student-facing Parent Hub (/student/parent-hub).
// Auth-gated by the student's session — no token needed.
// Covers: monthly recap, portfolio, riwayat (with quiz scores + topic titles),
//         certificates, billing.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStudentCertificates, type CertificateWithModule } from '@/features/certificates/queries';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface MonthlyRecap {
  monthLabel:     string;    // e.g. "Oktober 2026"
  attendedCount:  number;
  totalScheduled: number;
  attendanceRate: number;    // 0–100 integer percentage
  xpThisMonth:    number;
  coinsTotal:     number;
  totalXp:        number;
  avgQuizScore:   number;    // 0–100 average across all topic_quiz_attempts best scores
  moduleStatus:   string;    // e.g. "Desain 3D Tinkercad · 3/5 topik selesai"
}

export interface PortfolioItem {
  submissionId:   number;
  challengeTitle: string;
  topicTitle:     string | null;
  submissionUrl:  string | null;
  approvedAt:     string | null;
}

export interface HubInvoice {
  id:                string;
  month_year:        string;
  attended_meetings: number;
  total_meetings:    number;
  price_per_meeting: number;
  total_amount:      number;
  bank_account:      string | null;
  status:            'draft' | 'sent' | 'paid';
}

export interface RiwayatSession {
  meeting_id:      number;
  title:           string;
  meeting_date:    string;
  has_joined:      boolean;
  progress_report: string | null;  // teacher note
  topic_title:     string | null;  // resolved from topics table
  quiz_score:      number | null;  // best attempt score for aligned topic (0-100)
}

export interface RiwayatModule {
  module_id:       number | null;
  module_title:    string;
  completed_count: number;         // sessions where has_joined = true
  sessions:        RiwayatSession[];
}

export interface StudentHubData {
  studentName:  string;
  monthly:      MonthlyRecap;
  portfolio:    PortfolioItem[];
  certificates: CertificateWithModule[];
  invoices:     HubInvoice[];
  riwayat:      RiwayatModule[];
}

// ── getStudentHubData ─────────────────────────────────────────────────────────

export async function getStudentHubData(studentId: string): Promise<StudentHubData> {
  const db  = createSupabaseAdminClient();
  const now = new Date();

  // ── 1. Student base info ──────────────────────────────────────────────────
  const { data: student } = await (db
    .from('students')
    .select('full_name, total_xp, coins')
    .eq('id', studentId)
    .maybeSingle() as unknown as Promise<{
      data: { full_name: string; total_xp: number; coins: number } | null;
      error: unknown;
    }>);

  const studentName = student?.full_name ?? 'Siswa';
  const totalXp     = student?.total_xp  ?? 0;
  const coinsTotal  = student?.coins     ?? 0;

  // ── 2. All meeting_student rows — used by multiple sections ──────────────
  const { data: msRows } = await (db
    .from('meeting_students')
    .select('meeting_id, has_joined')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ meeting_id: number; has_joined: boolean }> | null;
      error: unknown;
    }>);

  const allMsRows  = msRows ?? [];
  const meetingIds = allMsRows.map((r) => r.meeting_id);
  const joinedMap  = new Map(allMsRows.map((r) => [r.meeting_id, r.has_joined]));

  // ── 3. Monthly attendance ─────────────────────────────────────────────────
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  let attendedCount  = 0;
  let totalScheduled = 0;

  if (meetingIds.length > 0) {
    const { data: thisMoMeetings } = await (db
      .from('meetings')
      .select('id')
      .in('id', meetingIds)
      .gte('meeting_date', monthStart)
      .lte('meeting_date', monthEnd) as unknown as Promise<{
        data: Array<{ id: number }> | null;
        error: unknown;
      }>);
    totalScheduled = (thisMoMeetings ?? []).length;
    attendedCount  = (thisMoMeetings ?? []).filter((m) => joinedMap.get(m.id) === true).length;
  }

  const attendanceRate = totalScheduled > 0
    ? Math.round((attendedCount / totalScheduled) * 100)
    : 0;

  // XP this month
  const { data: tpRows } = await (db
    .from('topic_progress')
    .select('xp_earned')
    .eq('student_id', studentId)
    .gte('completed_at', monthStart)
    .lte('completed_at', monthEnd) as unknown as Promise<{
      data: Array<{ xp_earned: number }> | null;
      error: unknown;
    }>);
  const xpThisMonth = (tpRows ?? []).reduce((s, r) => s + r.xp_earned, 0);

  // ── 4. Enrolled modules + topics (for riwayat grouping + module status) ──
  const { data: enrollments } = await (db
    .from('student_modules')
    .select('module_id, status, modules ( id, title )')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{
        module_id: number;
        status:    string;
        modules:   { id: number; title: string } | null;
      }> | null;
      error: unknown;
    }>);

  const enrolledModuleIds = (enrollments ?? []).map((e) => e.module_id);

  // All published topics in enrolled modules, ordered for globalIndex alignment
  let flattenedTopics: Array<{ id: number; title: string; module_id: number; order_index: number }> = [];

  if (enrolledModuleIds.length > 0) {
    const { data: topicsData } = await (db
      .from('topics')
      .select('id, title, module_id, order_index')
      .in('module_id', enrolledModuleIds)
      .eq('status', 'published')
      .order('order_index', { ascending: true }) as unknown as Promise<{
        data: Array<{ id: number; title: string; module_id: number; order_index: number }> | null;
        error: unknown;
      }>);

    // Flatten in module_id order (active first)
    const activeEnrollment = (enrollments ?? []).find((e) => e.status === 'active');
    const sortedModIds = [
      ...(activeEnrollment ? [activeEnrollment.module_id] : []),
      ...(enrollments ?? [])
        .filter((e) => e.status !== 'active')
        .map((e) => e.module_id),
    ];

    for (const modId of sortedModIds) {
      const modTopics = (topicsData ?? [])
        .filter((t) => t.module_id === modId)
        .sort((a, b) => a.order_index - b.order_index);
      flattenedTopics.push(...modTopics);
    }
  }

  // ── 5. Quiz best scores per topic (from topic_quiz_attempts) ──────────────
  const topicIds = flattenedTopics.map((t) => t.id);
  const quizBestMap = new Map<number, number>(); // topic_id → best score

  if (topicIds.length > 0) {
    const { data: quizAttempts } = await (db
      .from('topic_quiz_attempts')
      .select('topic_id, score')
      .eq('student_id', studentId)
      .in('topic_id', topicIds) as unknown as Promise<{
        data: Array<{ topic_id: number; score: number }> | null;
        error: unknown;
      }>);

    for (const qa of quizAttempts ?? []) {
      const prev = quizBestMap.get(qa.topic_id) ?? 0;
      if (qa.score > prev) quizBestMap.set(qa.topic_id, qa.score);
    }
  }

  // Average quiz score across all attempted topics
  const attemptedScores = [...quizBestMap.values()];
  const avgQuizScore = attemptedScores.length > 0
    ? Math.round(attemptedScores.reduce((s, v) => s + v, 0) / attemptedScores.length)
    : 0;

  // ── 6. Module status string ───────────────────────────────────────────────
  const activeEnrollment = (enrollments ?? []).find((e) => e.status === 'active');
  let moduleStatus = 'Belum ada modul aktif';
  if (activeEnrollment?.modules) {
    const activeTopics  = flattenedTopics.filter((t) => t.module_id === activeEnrollment.module_id);
    const completedTopics = activeTopics.filter((t) => quizBestMap.has(t.id) && quizBestMap.get(t.id)! >= 70).length;
    moduleStatus = `${activeEnrollment.modules.title} · ${completedTopics}/${activeTopics.length} topik`;
  }

  // ── 7. Build globalIndex: chronological meeting → aligned topic ───────────
  // Sort ALL meeting_student rows by meeting_date ascending
  let sortedAllMeetings: Array<{ id: number; meeting_date: string }> = [];

  if (meetingIds.length > 0) {
    const { data: allMeetingDates } = await (db
      .from('meetings')
      .select('id, meeting_date')
      .in('id', meetingIds)
      .order('meeting_date', { ascending: true }) as unknown as Promise<{
        data: Array<{ id: number; meeting_date: string }> | null;
        error: unknown;
      }>);
    sortedAllMeetings = allMeetingDates ?? [];
  }

  // meeting_id → { topic_id, topic_title, quiz_score }
  const meetingTopicMap = new Map<number, { topic_title: string | null; quiz_score: number | null }>();

  for (let i = 0; i < sortedAllMeetings.length; i++) {
    const m = sortedAllMeetings[i];
    if (flattenedTopics.length > 0) {
      const topic     = flattenedTopics[i % flattenedTopics.length];
      const quizScore = quizBestMap.get(topic.id) ?? null;
      meetingTopicMap.set(m.id, {
        topic_title: topic.title,
        quiz_score:  quizScore,
      });
    } else {
      meetingTopicMap.set(m.id, { topic_title: null, quiz_score: null });
    }
  }

  // ── 8. Completed sessions for riwayat ─────────────────────────────────────
  const riwayat: RiwayatModule[] = [];

  if (meetingIds.length > 0) {
    const { data: completedMeetings } = await (db
      .from('meetings')
      .select('id, title, meeting_date, progress_report')
      .in('id', meetingIds)
      .eq('is_completed', true)
      .order('meeting_date', { ascending: false }) as unknown as Promise<{
        data: Array<{
          id:              number;
          title:           string;
          meeting_date:    string;
          progress_report: string | null;
        }> | null;
        error: unknown;
      }>);

    // Build sessions with topic_title + quiz_score resolved
    const sessions: RiwayatSession[] = (completedMeetings ?? []).map((m) => {
      const topicData = meetingTopicMap.get(m.id);
      return {
        meeting_id:      m.id,
        title:           m.title,
        meeting_date:    m.meeting_date,
        has_joined:      joinedMap.get(m.id) ?? false,
        progress_report: m.progress_report,
        topic_title:     topicData?.topic_title ?? null,
        quiz_score:      topicData?.quiz_score  ?? null,
      };
    });

    // Group sessions by module via substring matching (same best-effort as before)
    const moduleGroups = new Map<number, { title: string; sessions: RiwayatSession[] }>();
    for (const en of enrollments ?? []) {
      if (en.modules) {
        moduleGroups.set(en.module_id, { title: en.modules.title, sessions: [] });
      }
    }

    const ungrouped: RiwayatSession[] = [];

    for (const s of sessions) {
      let placed = false;
      for (const [modId, group] of moduleGroups) {
        const modTitleLower = group.title.toLowerCase();
        if (
          s.title.toLowerCase().includes(modTitleLower) ||
          modTitleLower.split(' ').some((word) => word.length > 3 && s.title.toLowerCase().includes(word))
        ) {
          group.sessions.push(s);
          placed = true;
          break;
        }
      }
      if (!placed) ungrouped.push(s);
    }

    // Build riwayat array — active module first
    const sortedModIds = [
      ...(activeEnrollment ? [activeEnrollment.module_id] : []),
      ...(enrollments ?? []).filter((e) => e.status !== 'active').map((e) => e.module_id),
    ];

    for (const modId of sortedModIds) {
      const group = moduleGroups.get(modId);
      if (group && group.sessions.length > 0) {
        riwayat.push({
          module_id:       modId,
          module_title:    group.title,
          completed_count: group.sessions.filter((s) => s.has_joined).length,
          sessions:        group.sessions,
        });
      }
    }

    if (ungrouped.length > 0) {
      const activeGroup = activeEnrollment
        ? riwayat.find((r) => r.module_id === activeEnrollment.module_id)
        : null;
      if (activeGroup) {
        activeGroup.sessions.push(...ungrouped);
        activeGroup.completed_count = activeGroup.sessions.filter((s) => s.has_joined).length;
      } else {
        riwayat.push({
          module_id:       null,
          module_title:    'Sesi Lainnya',
          completed_count: ungrouped.filter((s) => s.has_joined).length,
          sessions:        ungrouped,
        });
      }
    }
  }

  // ── 9. Portfolio — approved challenge submissions ─────────────────────────
  const { data: approvedSubs } = await (db
    .from('challenge_submissions')
    .select('id, challenge_id, submission_url, reviewed_at')
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false }) as unknown as Promise<{
      data: Array<{
        id:             number;
        challenge_id:   number;
        submission_url: string | null;
        reviewed_at:    string | null;
      }> | null;
      error: unknown;
    }>);

  const portfolio: PortfolioItem[] = [];

  if ((approvedSubs ?? []).length > 0) {
    const challengeIds = (approvedSubs ?? []).map((s) => s.challenge_id);

    const { data: challenges } = await (db
      .from('challenges')
      .select('id, title, topic_id')
      .in('id', challengeIds) as unknown as Promise<{
        data: Array<{ id: number; title: string; topic_id: number }> | null;
        error: unknown;
      }>);

    const portTopicIds = [...new Set((challenges ?? []).map((c) => c.topic_id))];

    const { data: portTopics } = await (db
      .from('topics')
      .select('id, title')
      .in('id', portTopicIds) as unknown as Promise<{
        data: Array<{ id: number; title: string }> | null;
        error: unknown;
      }>);

    const chMap    = new Map((challenges ?? []).map((c) => [c.id, c]));
    const topicMap = new Map((portTopics ?? []).map((t) => [t.id, t]));

    for (const sub of approvedSubs ?? []) {
      const ch    = chMap.get(sub.challenge_id);
      const topic = ch ? topicMap.get(ch.topic_id) : null;
      portfolio.push({
        submissionId:   sub.id,
        challengeTitle: ch?.title ?? 'Challenge',
        topicTitle:     topic?.title ?? null,
        submissionUrl:  sub.submission_url,
        approvedAt:     sub.reviewed_at,
      });
    }
  }

  // ── 10. Certificates ──────────────────────────────────────────────────────
  const certificates = await getStudentCertificates(studentId);

  // ── 11. Invoices ──────────────────────────────────────────────────────────
  const { data: invoiceRows } = await (db
    .from('invoices')
    .select('id, month_year, attended_meetings, total_meetings, price_per_meeting, total_amount, bank_account, status')
    .eq('student_id', studentId)
    .order('month_year', { ascending: false }) as unknown as Promise<{
      data: HubInvoice[] | null;
      error: unknown;
    }>);

  const invoices = invoiceRows ?? [];

  // ── Assemble ──────────────────────────────────────────────────────────────
  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const monthly: MonthlyRecap = {
    monthLabel,
    attendedCount,
    totalScheduled,
    attendanceRate,
    xpThisMonth,
    coinsTotal,
    totalXp,
    avgQuizScore,
    moduleStatus,
  };

  return { studentName, monthly, portfolio, certificates, invoices, riwayat };
}

// ── Monthly snapshots (12-month archive for MonthlyReportCard) ────────────────

export interface MonthlySnapshot {
  monthYear:     string;   // "YYYY-MM"
  monthLabel:    string;   // "Oktober 2026"
  attendedCount: number;
  totalScheduled: number;
  attendanceRate: number;  // 0–100
  avgQuizScore:  number;   // 0–100, 0 = no attempts
  topicsCompleted: number; // topics with best quiz score ≥ 70
  xpEarned:      number;
  sessions:      Array<{
    meeting_id:      number;
    title:           string;
    meeting_date:    string;
    has_joined:      boolean;
    quiz_score:      number | null;
    topic_title:     string | null;
    progress_report: string | null;
  }>;
}

/**
 * Returns per-month snapshots for the last 12 calendar months (inclusive of
 * the current month). Each snapshot contains attendance, quiz stats, and the
 * full session list needed for the "Unduh Laporan" print view.
 */
export async function getMonthlySnapshots(
  studentId: string
): Promise<MonthlySnapshot[]> {
  const db  = createSupabaseAdminClient();
  const now = new Date();

  // Build 12 month windows: current month first, then 11 months back
  const windows: Array<{ monthYear: string; monthLabel: string; start: string; end: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const mm    = String(d.getMonth() + 1).padStart(2, '0');
    windows.push({
      monthYear:  `${d.getFullYear()}-${mm}`,
      monthLabel: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      start,
      end,
    });
  }

  // ── 1. All meeting_student rows for the student ───────────────────────────
  const { data: msRows } = await (db
    .from('meeting_students')
    .select('meeting_id, has_joined')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ meeting_id: number; has_joined: boolean }> | null;
      error: unknown;
    }>);

  const allMs     = msRows ?? [];
  const meetingIds = allMs.map((r) => r.meeting_id);
  const joinedMap = new Map(allMs.map((r) => [r.meeting_id, r.has_joined]));

  if (meetingIds.length === 0) {
    return windows.map((w) => ({
      monthYear:       w.monthYear,
      monthLabel:      w.monthLabel,
      attendedCount:   0,
      totalScheduled:  0,
      attendanceRate:  0,
      avgQuizScore:    0,
      topicsCompleted: 0,
      xpEarned:        0,
      sessions:        [],
    }));
  }

  // ── 2. All completed meetings with date + teacher note ────────────────────
  const { data: allMeetings } = await (db
    .from('meetings')
    .select('id, title, meeting_date, progress_report, is_completed')
    .in('id', meetingIds)
    .order('meeting_date', { ascending: true }) as unknown as Promise<{
      data: Array<{
        id:              number;
        title:           string;
        meeting_date:    string;
        progress_report: string | null;
        is_completed:    boolean;
      }> | null;
      error: unknown;
    }>);

  const meetings = allMeetings ?? [];

  // ── 3. Enrolled modules + published topics for globalIndex mapping ────────
  const { data: enrollments } = await (db
    .from('student_modules')
    .select('module_id, status')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ module_id: number; status: string }> | null;
      error: unknown;
    }>);

  const enrolledModuleIds = (enrollments ?? []).map((e) => e.module_id);
  let flatTopics: Array<{ id: number; title: string; module_id: number; order_index: number }> = [];

  if (enrolledModuleIds.length > 0) {
    const { data: topicsData } = await (db
      .from('topics')
      .select('id, title, module_id, order_index')
      .in('module_id', enrolledModuleIds)
      .eq('status', 'published')
      .order('order_index', { ascending: true }) as unknown as Promise<{
        data: Array<{ id: number; title: string; module_id: number; order_index: number }> | null;
        error: unknown;
      }>);

    const active = (enrollments ?? []).find((e) => e.status === 'active');
    const sorted = [
      ...(active ? [active.module_id] : []),
      ...(enrollments ?? []).filter((e) => e.status !== 'active').map((e) => e.module_id),
    ];
    for (const modId of sorted) {
      const mt = (topicsData ?? [])
        .filter((t) => t.module_id === modId)
        .sort((a, b) => a.order_index - b.order_index);
      flatTopics.push(...mt);
    }
  }

  // ── 4. Best quiz score per topic ──────────────────────────────────────────
  const topicIds = flatTopics.map((t) => t.id);
  const quizBest = new Map<number, number>();

  if (topicIds.length > 0) {
    const { data: attempts } = await (db
      .from('topic_quiz_attempts')
      .select('topic_id, score, submitted_at')
      .eq('student_id', studentId)
      .in('topic_id', topicIds) as unknown as Promise<{
        data: Array<{ topic_id: number; score: number; submitted_at: string }> | null;
        error: unknown;
      }>);

    for (const a of attempts ?? []) {
      const prev = quizBest.get(a.topic_id) ?? 0;
      if (a.score > prev) quizBest.set(a.topic_id, a.score);
    }
  }

  // ── 5. GlobalIndex: meeting chronological position → topic mapping ────────
  const meetingTopicMap = new Map<number, { topic_title: string | null; quiz_score: number | null }>();
  for (let i = 0; i < meetings.length; i++) {
    const m = meetings[i];
    if (flatTopics.length > 0) {
      const topic = flatTopics[i % flatTopics.length];
      meetingTopicMap.set(m.id, {
        topic_title: topic.title,
        quiz_score:  quizBest.get(topic.id) ?? null,
      });
    } else {
      meetingTopicMap.set(m.id, { topic_title: null, quiz_score: null });
    }
  }

  // ── 6. XP per month from topic_progress ──────────────────────────────────
  const { data: tpAll } = await (db
    .from('topic_progress')
    .select('xp_earned, completed_at')
    .eq('student_id', studentId) as unknown as Promise<{
      data: Array<{ xp_earned: number; completed_at: string }> | null;
      error: unknown;
    }>);

  // ── 7. Build snapshot per month window ────────────────────────────────────
  return windows.map((w) => {
    const inWindow = meetings.filter(
      (m) => m.meeting_date >= w.start && m.meeting_date <= w.end
    );

    const scheduled = inWindow.length;
    const attended  = inWindow.filter((m) => joinedMap.get(m.id) === true).length;
    const rate      = scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0;

    // Quiz scores for meetings in this window
    const scores = inWindow
      .map((m) => meetingTopicMap.get(m.id)?.quiz_score ?? null)
      .filter((s): s is number => s !== null);
    const avg = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Topics completed (best score ≥ 70) in this window — approximation via
    // topic_progress.completed_at if available, otherwise from quiz attempts in window
    const topicsThisMonth = inWindow
      .map((m) => meetingTopicMap.get(m.id)?.quiz_score)
      .filter((s): s is number => typeof s === 'number' && s >= 70).length;

    // XP this month
    const xpEarned = (tpAll ?? [])
      .filter((t) => t.completed_at >= w.start && t.completed_at <= w.end)
      .reduce((s, t) => s + t.xp_earned, 0);

    const sessions = inWindow.map((m) => {
      const td = meetingTopicMap.get(m.id);
      return {
        meeting_id:      m.id,
        title:           m.title,
        meeting_date:    m.meeting_date,
        has_joined:      joinedMap.get(m.id) ?? false,
        quiz_score:      td?.quiz_score      ?? null,
        topic_title:     td?.topic_title     ?? null,
        progress_report: m.progress_report,
      };
    });

    return {
      monthYear:       w.monthYear,
      monthLabel:      w.monthLabel,
      attendedCount:   attended,
      totalScheduled:  scheduled,
      attendanceRate:  rate,
      avgQuizScore:    avg,
      topicsCompleted: topicsThisMonth,
      xpEarned,
      sessions,
    };
  });
}
