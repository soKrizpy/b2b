// src/features/dashboard/admin/metrics.ts
// Derives operational KPI metrics from already-fetched meeting data.
// Pure functions — no extra DB calls.

import { isLive, isUpcoming } from '@/lib/formatDate';
import type { MeetingWithStudents } from '@/features/sessions/queries';

export interface AdminMetrics {
  /** Meetings currently in progress right now. */
  liveNowCount: number;
  /** Meetings scheduled for today (any time). */
  todayTotalCount: number;
  /** Distinct students with at least one upcoming session. */
  activeStudentsCount: number;
  /** Upcoming meetings that have no valid link_url. */
  needsAttentionCount: number;
}

function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth()    === dateB.getMonth()    &&
    dateA.getDate()     === dateB.getDate()
  );
}

function hasValidLink(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  try { new URL(url); return true; } catch { return false; }
}

export function computeAdminMetrics(meetings: MeetingWithStudents[]): AdminMetrics {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const liveNowCount = meetings.filter((m) => isLive(m.meeting_date)).length;

  const todayTotalCount = meetings.filter((m) =>
    isSameDay(new Date(m.meeting_date), today)
  ).length;

  // Active students = distinct student_ids across all upcoming sessions
  const upcomingStudentIds = new Set<string>();
  meetings
    .filter((m) => !m.is_completed && isUpcoming(m.meeting_date))
    .forEach((m) =>
      m.meeting_students.forEach((ms) => upcomingStudentIds.add(ms.student_id))
    );
  const activeStudentsCount = upcomingStudentIds.size;

  const needsAttentionCount = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date) && !hasValidLink(m.link_url)
  ).length;

  return { liveNowCount, todayTotalCount, activeStudentsCount, needsAttentionCount };
}
