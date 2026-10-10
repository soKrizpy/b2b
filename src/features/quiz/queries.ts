// src/features/quiz/queries.ts
// Read-side helpers for topic quiz attempts and the inline quiz data stored
// in lesson_content JSONB.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopicQuiz } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow, QuizAnswer } from '@/types/database';

// ── Per-topic quiz state for a student ────────────────────────────────────────

export interface TopicQuizState {
  /** Quiz questions from lesson_content.quiz[] — empty if topic has no quiz. */
  questions:       import('@/features/curriculum/validation').QuizQuestion[];
  attempts:        TopicQuizAttemptRow[];
  attemptsUsed:    number;   // 0, 1, or 2
  bestScore:       number;   // 0–100; 0 if no attempts
  isLocked:        boolean;  // true when attemptsUsed >= 2
  /** Whether the teacher has marked the session for this student as complete,
   *  unlocking the quiz. True when at least one meeting is is_completed AND
   *  the student has_joined that meeting. */
  isUnlocked:      boolean;
}

/** Returns the quiz state for a specific topic + student. */
export async function getTopicQuizState(
  topicId: number,
  studentId: string
): Promise<TopicQuizState> {
  const db = createSupabaseAdminClient();

  // Fetch topic (for lesson_content containing quiz[])
  const { data: topicRow } = await (db
    .from('topics')
    .select('lesson_content')
    .eq('id', topicId)
    .maybeSingle() as unknown as Promise<{
      data: { lesson_content: unknown } | null;
      error: unknown;
    }>);

  const questions = topicRow ? extractTopicQuiz(topicRow.lesson_content) : [];

  // Fetch existing attempts for this student+topic
  const { data: attemptRows } = await (db
    .from('topic_quiz_attempts')
    .select('id, student_id, topic_id, attempt_num, score, answers, submitted_at')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .order('attempt_num', { ascending: true }) as unknown as Promise<{
      data: TopicQuizAttemptRow[];
      error: unknown;
    }>);

  const attempts     = attemptRows ?? [];
  const attemptsUsed = attempts.length;
  const bestScore    = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.score))
    : 0;

  // Quiz unlocks only when teacher has marked the student's session complete
  // (meeting is_completed AND has_joined by this student)
  const { data: joinRows } = await (db
    .from('meeting_students')
    .select('meeting_id, has_joined, meetings!inner(is_completed)')
    .eq('student_id', studentId)
    .eq('has_joined', true) as unknown as Promise<{
      data: Array<{
        meeting_id: number;
        has_joined: boolean;
        meetings: { is_completed: boolean };
      }>;
      error: unknown;
    }>);

  const hasCompletedSession = (joinRows ?? []).some(
    (r) => r.has_joined && r.meetings?.is_completed === true
  );

  return {
    questions,
    attempts,
    attemptsUsed,
    bestScore,
    isLocked:    attemptsUsed >= 2,
    isUnlocked:  hasCompletedSession || attemptsUsed > 0, // keep unlocked if already attempted
  };
}

/** Returns all quiz attempts for a student across all topics (for parent report). */
export async function getAllQuizAttemptsByStudent(
  studentId: string
): Promise<TopicQuizAttemptRow[]> {
  const db = createSupabaseAdminClient();
  const { data } = await (db
    .from('topic_quiz_attempts')
    .select('id, student_id, topic_id, attempt_num, score, answers, submitted_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false }) as unknown as Promise<{
      data: TopicQuizAttemptRow[];
      error: unknown;
    }>);
  return data ?? [];
}
