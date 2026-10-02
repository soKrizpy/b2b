// src/features/curriculum/queries.ts
// Read-side query helpers for modules and topics.
// All queries use the admin client (bypasses RLS) â€” called only from
// Server Components, Server Actions, and Route Handlers.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ModuleRow, TopicRow, StudentModuleRow } from '@/types/database';

// â”€â”€ Result shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TopicWithChallengeCount extends TopicRow {
  challenge_count: number;
}

export interface ModuleWithTopics extends ModuleRow {
  topics: TopicWithChallengeCount[];
}

// â”€â”€ Modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** All modules, ordered newest-first. Admin use. */
export async function getAllModules(): Promise<ModuleRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) { console.error('[getAllModules]', error.message); return []; }
  return (data ?? []) as ModuleRow[];
}

/** Single module by id. */
export async function getModuleById(moduleId: number): Promise<ModuleRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .eq('id', moduleId)
    .maybeSingle();

  if (error) { console.error('[getModuleById]', error.message); return null; }
  return data as ModuleRow | null;
}

/**
 * All modules the student is currently enrolled in (status = 'active').
 * Returns modules with their published topics and challenge counts.
 */
export async function getStudentModulesWithTopics(studentId: string): Promise<ModuleWithTopics[]> {
  const db = createSupabaseAdminClient();

  // 1. Enrolled module ids
  const { data: enrollments, error: enErr } = await db
    .from('student_modules')
    .select('module_id')
    .eq('student_id', studentId)
    .eq('status', 'active') as unknown as {
      data: Array<{ module_id: number }>;
      error: { message: string } | null;
    };

  if (enErr || !enrollments?.length) return [];

  const moduleIds = enrollments.map((e) => e.module_id);

  // 2. Modules
  const { data: modules, error: modErr } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .in('id', moduleIds)
    .order('created_at', { ascending: false });

  if (modErr || !modules?.length) return [];

  // 3. Published topics for those modules
  const { data: topics, error: topErr } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .in('module_id', moduleIds)
    .eq('status', 'published')
    .order('order_index', { ascending: true });

  if (topErr) { console.error('[getStudentModulesWithTopics] topics', topErr.message); }

  const topicList = (topics ?? []) as unknown as TopicRow[];
  const topicIds  = topicList.map((t) => t.id);

  // 4. Challenge counts per topic
  const challengeCountMap = new Map<number, number>();
  if (topicIds.length > 0) {
    const { data: challenges } = await db
      .from('challenges')
      .select('topic_id') as unknown as {
        data: Array<{ topic_id: number }>;
        error: unknown;
      };

    (challenges ?? []).forEach((c) => {
      if (topicIds.includes(c.topic_id)) {
        challengeCountMap.set(c.topic_id, (challengeCountMap.get(c.topic_id) ?? 0) + 1);
      }
    });
  }

  return (modules as unknown as ModuleRow[]).map((mod) => ({
    ...mod,
    topics: topicList
      .filter((t) => t.module_id === mod.id)
      .map((t) => ({ ...t, challenge_count: challengeCountMap.get(t.id) ?? 0 })),
  }));
}

// â”€â”€ Topics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** All topics for a module (admin â€” all statuses). */
export async function getTopicsByModuleId(moduleId: number): Promise<TopicRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });

  if (error) { console.error('[getTopicsByModuleId]', error.message); return []; }
  return (data ?? []) as unknown as TopicRow[];
}

/** Single topic by id. */
export async function getTopicById(topicId: number): Promise<TopicRow | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .eq('id', topicId)
    .maybeSingle();

  if (error) { console.error('[getTopicById]', error.message); return null; }
  return data as unknown as TopicRow | null;
}

/** All modules with their topics and challenge counts. Admin curriculum view. */
export async function getAllModulesWithTopics(): Promise<ModuleWithTopics[]> {
  const db = createSupabaseAdminClient();

  const { data: modules, error: modErr } = await db
    .from('modules')
    .select('id, title, description, level, gamification_type, is_active, created_at')
    .order('created_at', { ascending: false });

  if (modErr || !modules?.length) return [];

  const moduleIds = (modules as unknown as ModuleRow[]).map((m) => m.id);

  const { data: topics, error: topErr } = await db
    .from('topics')
    .select('id, module_id, title, order_index, description, project_link, topic_link, engine_topic_id, lesson_content, status, published_at, created_at')
    .in('module_id', moduleIds)
    .order('order_index', { ascending: true });

  if (topErr) console.error('[getAllModulesWithTopics] topics', topErr.message);

  const topicList  = (topics ?? []) as unknown as TopicRow[];
  const topicIds   = topicList.map((t) => t.id);

  const challengeCountMap = new Map<number, number>();
  if (topicIds.length > 0) {
    const { data: challenges } = await db
      .from('challenges')
      .select('topic_id') as unknown as {
        data: Array<{ topic_id: number }>;
        error: unknown;
      };

    (challenges ?? []).forEach((c) => {
      challengeCountMap.set(c.topic_id, (challengeCountMap.get(c.topic_id) ?? 0) + 1);
    });
  }

  return (modules as unknown as ModuleRow[]).map((mod) => ({
    ...mod,
    topics: topicList
      .filter((t) => t.module_id === mod.id)
      .map((t) => ({ ...t, challenge_count: challengeCountMap.get(t.id) ?? 0 })),
  }));
}

