// src/features/quiz/questMapQueries.ts
// Batch-fetches quiz state for every topic in a module in a single pass.
// Used by the Quest Map page to compute the 4 node states without N+1 queries.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopicQuiz } from '@/features/curriculum/validation';
import type { TopicWithChallengeCount, ModuleWithTopics } from '@/features/curriculum/queries';

// ── Node status ───────────────────────────────────────────────────────────────

export type NodeStatus =
  | 'COMPLETED'   // quiz done (bestScore ≥ 70 OR both attempts used) AND session completed
  | 'NEEDS_QUIZ'  // session completed, quiz available, not yet done/locked
  | 'ACTIVE_NEXT' // next unlocked topic after the last COMPLETED one
  | 'LOCKED';     // not yet unlocked

// ── Per-topic enriched data ───────────────────────────────────────────────────

export interface QuestTopicNode {
  topic:        TopicWithChallengeCount;
  status:       NodeStatus;
  hasQuiz:      boolean;
  attemptsUsed: number;   // 0–2
  bestScore:    number;   // 0–100
  stars:        0 | 1 | 2 | 3;
}

// ── getQuestMapData ───────────────────────────────────────────────────────────

export interface QuestMapData {
  mod:              ModuleWithTopics;
  nodes:            QuestTopicNode[];
  moduleComplete:   boolean;
  hasFinal:         boolean;
  needsQuizTopics:  QuestTopicNode[]; // topics that need quiz action (for banner)
}

export async function getQuestMapData(
  studentId: string,
  mod:       ModuleWithTopics
): Promise<QuestMapData> {
  const db       = createSupabaseAdminClient();
  const topicIds = mod.topics.map((t) => t.id);

  // ── 1 & 2. Parallel batch: quiz attempts + session attendance unlock ────────
  const [attemptsRes, joinRowsRes] = await Promise.all([
    topicIds.length > 0
      ? (db
          .from('topic_quiz_attempts')
          .select('topic_id, attempt_num, score, submitted_at')
          .eq('student_id', studentId)
          .in('topic_id', topicIds) as unknown as Promise<{
            data: Array<{ topic_id: number; attempt_num: number; score: number; submitted_at: string }> | null;
            error: unknown;
          }>)
      : Promise.resolve({ data: [], error: null }),
    db
      .from('meeting_students')
      .select('meeting_id, has_joined, meetings!inner(is_completed)')
      .eq('student_id', studentId)
      .eq('has_joined', true) as unknown as Promise<{
        data: Array<{
          meeting_id: number;
          has_joined: boolean;
          meetings: { is_completed: boolean };
        }> | null;
        error: unknown;
      }>,
  ]);

  // Best score + count per topic
  const attemptsMap = new Map<number, { count: number; bestScore: number }>();
  for (const a of attemptsRes.data ?? []) {
    const prev = attemptsMap.get(a.topic_id) ?? { count: 0, bestScore: 0 };
    attemptsMap.set(a.topic_id, {
      count:     prev.count + 1,
      bestScore: Math.max(prev.bestScore, a.score),
    });
  }

  const sessionUnlocked = (joinRowsRes.data ?? []).some(
    (r) => r.has_joined && r.meetings?.is_completed === true
  );

  // ── 3. Derive per-topic hasQuiz from lesson_content ──────────────────────
  // Topics in mod already have lesson_content via the join; we need to check
  // lesson_content.quiz[].length > 0
  const hasQuizMap = new Map<number, boolean>();
  for (const t of mod.topics) {
    const lc = t.lesson_content as Record<string, unknown> | null;
    hasQuizMap.set(t.id, Array.isArray(lc?.quiz) && (lc!.quiz as unknown[]).length > 0);
  }

  // ── 4. Compute stars ──────────────────────────────────────────────────────
  function computeStars(bestScore: number, attemptsUsed: number): 0 | 1 | 2 | 3 {
    if (attemptsUsed === 0) return 0;
    if (bestScore >= 100) return 3;
    if (bestScore >= 80)  return 2;
    return 1;
  }

  // ── 5. Compute per-topic status sequentially ─────────────────────────────
  // A topic is "done" (for sequential unlock) when:
  //   - it has no quiz → auto-done once the node before it is done
  //   - it has a quiz  → bestScore ≥ 70 OR attemptsUsed >= 2
  const nodes: QuestTopicNode[] = [];
  let lastCompletedIdx = -1; // highest consecutive completed index
  let activeNextAssigned = false;

  for (let idx = 0; idx < mod.topics.length; idx++) {
    const topic       = mod.topics[idx];
    const hasQuiz     = hasQuizMap.get(topic.id) ?? false;
    const quizInfo    = attemptsMap.get(topic.id) ?? { count: 0, bestScore: 0 };
    const { count: attemptsUsed, bestScore } = quizInfo;

    // "Done" definition: session is unlocked AND (no quiz OR quiz threshold met)
    const quizDone = !hasQuiz || (attemptsUsed > 0 && (bestScore >= 70 || attemptsUsed >= 2));
    const isDone   = sessionUnlocked && quizDone;

    if (isDone) {
      lastCompletedIdx = idx;
    }

    nodes.push({
      topic,
      hasQuiz,
      attemptsUsed,
      bestScore,
      stars: computeStars(bestScore, attemptsUsed),
      status: 'LOCKED', // will be overwritten below
    });
  }

  // Second pass: assign statuses based on lastCompletedIdx
  for (let idx = 0; idx < nodes.length; idx++) {
    const n        = nodes[idx];
    const hasQuiz  = n.hasQuiz;
    const { attemptsUsed, bestScore } = n;

    if (idx <= lastCompletedIdx) {
      // All topics up to and including lastCompletedIdx are COMPLETED
      n.status = 'COMPLETED';
    } else if (idx === lastCompletedIdx + 1) {
      // The first topic after the completed streak
      if (sessionUnlocked) {
        if (hasQuiz && attemptsUsed < 2 && bestScore < 70) {
          // Quiz available and not yet passed — student needs to take it
          n.status = 'NEEDS_QUIZ';
        } else if (!activeNextAssigned) {
          n.status = 'ACTIVE_NEXT';
          activeNextAssigned = true;
        } else {
          n.status = 'LOCKED';
        }
      } else {
        // No session completed yet — first unlocked topic is ACTIVE_NEXT
        if (!activeNextAssigned) {
          n.status = 'ACTIVE_NEXT';
          activeNextAssigned = true;
        }
      }
    } else {
      n.status = 'LOCKED';
    }
  }

  const moduleComplete = lastCompletedIdx === mod.topics.length - 1 && mod.topics.length > 0;
  const hasFinal       = (mod.description ?? '').startsWith('FINAL_ASSESSMENT:');
  const needsQuizTopics = nodes.filter((n) => n.status === 'NEEDS_QUIZ');

  return { mod, nodes, moduleComplete, hasFinal, needsQuizTopics };
}
