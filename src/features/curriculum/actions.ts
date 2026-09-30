// src/features/curriculum/actions.ts
// Admin Server Actions: JSON bulk import/export + delete (module/topic).
// The old manual create/update forms have been removed — use importCurriculumJson instead.
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAllModulesWithTopics } from './queries';

export type CurriculumActionResult =
  | { success: true; message: string; stats?: { modules: number; topics: number } }
  | { success: false; error: string; fields?: Record<string, string> };

// ── Curriculum JSON schema (Zod v4) ───────────────────────────────────────────
// Must be a superset of the engine's LearningNode shape so lesson_content is
// written in the canonical { learningPath: [...] } format read by the student UI.

const nodeSchema = z.object({
  node_id:           z.string().min(1, 'node_id wajib diisi'),
  order:             z.number().int().min(0),
  type:              z.enum(['theory', 'quiz', 'challenge', 'code', 'practice', 'lesson']),
  title:             z.string().min(1),
  content:           z.string().optional(),        // explanation / body text
  code_content:      z.string().optional(),        // for code-type nodes
  code_language:     z.string().optional(),
  options:           z.array(z.string()).optional(), // quiz options
  correct_option:    z.string().optional(),          // free-text correct answer
  instructions:      z.string().optional(),
  xp:                z.number().int().min(0).default(0),
});

const topicImportSchema = z.object({
  topic_title:  z.string().min(1, 'topic_title wajib diisi').max(200),
  topic_order:  z.number().int().min(0),
  description:  z.string().optional(),
  project_link: z.string().url().optional().or(z.literal('')),
  nodes:        z.array(nodeSchema).default([]),
});

const moduleImportSchema = z.object({
  module_title:      z.string().min(1, 'module_title wajib diisi').max(200),
  module_order:      z.number().int().min(0),
  description:       z.string().optional(),
  level:             z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  gamification_type: z.enum(['mimo', 'duolingo', 'boardgame', 'quest', 'flashcard']).default('mimo'),
  topics:            z.array(topicImportSchema).default([]),
});

// Top-level payload: a single module OR an array of modules
export const curriculumJsonSchema = z.union([
  z.array(moduleImportSchema).min(1, 'JSON harus berisi minimal satu modul'),
  moduleImportSchema.transform((m) => [m]),  // also accept a single module object
]);

export type CurriculumJsonInput = z.infer<typeof curriculumJsonSchema>;
export type ModuleImport = z.infer<typeof moduleImportSchema>;
export type TopicImport  = z.infer<typeof topicImportSchema>;
export type NodeImport   = z.infer<typeof nodeSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a NodeImport to the canonical LearningNode shape stored in
 * lesson_content.learningPath — compatible with the existing lesson engine.
 */
function nodeToLearningNode(n: NodeImport) {
  // Map our type names to the engine's NodeType values
  const typeMap: Record<string, string> = {
    theory:    'lesson',
    quiz:      'quiz',
    challenge: 'challenge',
    code:      'code',
    practice:  'practice',
    lesson:    'lesson',
  };

  return {
    id:            n.node_id,
    type:          typeMap[n.type] ?? n.type,
    title:         n.title,
    xp:            n.xp,
    explanation:   n.content,
    instructions:  n.instructions,
    options:       n.options,
    correctOption: n.correct_option,
    content:       n.content,
    ...(n.code_content && {
      code: { language: n.code_language ?? 'text', content: n.code_content },
    }),
  };
}

const REVALIDATE_PATHS = ['/admin/curriculum', '/admin/dashboard', '/student/lessons'];
function revalidateAll() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p, 'layout'));
}

// ── importCurriculumJson ──────────────────────────────────────────────────────

/**
 * Bulk-upserts modules and topics from a validated curriculum JSON payload.
 *
 * Strategy:
 *   - Match existing modules by title (case-insensitive). If found, update; otherwise insert.
 *   - Match existing topics by (module_id, title). If found, update lesson_content + metadata;
 *     otherwise insert.
 *   - lesson_content is always overwritten with the new nodes (stored as learningPath[]).
 *   - Existing quiz_attempts and topic_progress are NEVER touched.
 *   - Status is set to 'published' for topics that have nodes, 'draft' otherwise.
 */
export async function importCurriculumJson(
  payload: unknown
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  // ── 1. Validate ────────────────────────────────────────────────────────────
  const parsed = curriculumJsonSchema.safeParse(payload);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFormError = flat.formErrors[0];
    const firstFieldError = Object.values(flat.fieldErrors)[0];
    const msg = firstFormError
      ?? (Array.isArray(firstFieldError) ? firstFieldError[0] : null)
      ?? 'Format JSON tidak valid. Periksa struktur dan tipe data.';
    return { success: false, error: msg as string };
  }

  const modules = parsed.data;
  const db = createSupabaseAdminClient();
  let importedModules = 0;
  let importedTopics  = 0;

  // ── 2. Fetch existing modules (match by title) ─────────────────────────────
  const { data: existingModules } = await (db
    .from('modules')
    .select('id, title') as unknown as Promise<{
      data: Array<{ id: number; title: string }>;
      error: unknown;
    }>);

  const modTitleMap = new Map<string, number>(
    (existingModules ?? []).map((m) => [m.title.toLowerCase().trim(), m.id])
  );

  // ── 3. Upsert each module ──────────────────────────────────────────────────
  for (const mod of modules) {
    const normalizedTitle = mod.module_title.trim();
    let moduleId = modTitleMap.get(normalizedTitle.toLowerCase());

    if (moduleId) {
      // Update existing module metadata
      await (db
        .from('modules')
        .update({
          description:       mod.description ?? null,
          level:             mod.level,
          gamification_type: mod.gamification_type,
        } as never)
        .eq('id', moduleId) as unknown as Promise<unknown>);
    } else {
      // Insert new module
      const { data: newMod, error: modErr } = await (db
        .from('modules')
        .insert({
          title:             normalizedTitle,
          description:       mod.description ?? null,
          level:             mod.level,
          gamification_type: mod.gamification_type,
        } as never)
        .select('id')
        .single() as unknown as Promise<{
          data: { id: number } | null;
          error: { message: string } | null;
        }>);

      if (modErr || !newMod) {
        return { success: false, error: `Gagal membuat modul "${normalizedTitle}": ${modErr?.message}` };
      }

      moduleId = newMod.id;
      modTitleMap.set(normalizedTitle.toLowerCase(), moduleId);
    }

    importedModules++;

    // ── 4. Fetch existing topics for this module ───────────────────────────
    const { data: existingTopics } = await (db
      .from('topics')
      .select('id, title')
      .eq('module_id', moduleId) as unknown as Promise<{
        data: Array<{ id: number; title: string }>;
        error: unknown;
      }>);

    const topicTitleMap = new Map<string, number>(
      (existingTopics ?? []).map((t) => [t.title.toLowerCase().trim(), t.id])
    );

    // ── 5. Upsert each topic ───────────────────────────────────────────────
    for (const topic of mod.topics) {
      const topicTitle  = topic.topic_title.trim();
      const hasNodes    = topic.nodes.length > 0;
      const lessonContent = hasNodes
        ? { learningPath: topic.nodes.map(nodeToLearningNode) }
        : null;

      const existingTopicId = topicTitleMap.get(topicTitle.toLowerCase());

      if (existingTopicId) {
        await (db
          .from('topics')
          .update({
            order_index:    topic.topic_order,
            description:    topic.description ?? null,
            project_link:   topic.project_link || null,
            lesson_content: lessonContent,
            status:         hasNodes ? 'published' : 'draft',
            ...(hasNodes && { published_at: new Date().toISOString() }),
          } as never)
          .eq('id', existingTopicId) as unknown as Promise<unknown>);
      } else {
        const { error: topicErr } = await (db
          .from('topics')
          .insert({
            module_id:      moduleId,
            title:          topicTitle,
            order_index:    topic.topic_order,
            description:    topic.description ?? null,
            project_link:   topic.project_link || null,
            lesson_content: lessonContent,
            status:         hasNodes ? 'published' : 'draft',
            ...(hasNodes && { published_at: new Date().toISOString() }),
          } as never) as unknown as Promise<{ error: { message: string } | null }>);

        if (topicErr) {
          return { success: false, error: `Gagal membuat topik "${topicTitle}": ${topicErr.message}` };
        }
      }

      importedTopics++;
    }
  }

  revalidateAll();
  return {
    success: true,
    message: `Import berhasil! ${importedModules} modul, ${importedTopics} topik diproses.`,
    stats: { modules: importedModules, topics: importedTopics },
  };
}

// ── exportCurriculumJson ──────────────────────────────────────────────────────

/**
 * Returns the entire curriculum as a CurriculumJsonInput-compatible payload
 * ready for JSON.stringify and download. Called from the client export handler.
 */
export async function exportCurriculumJson(): Promise<
  | { success: true; data: unknown }
  | { success: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const modules = await getAllModulesWithTopics();

  const payload = modules.map((mod) => ({
    module_title:      mod.title ?? '',
    module_order:      0,
    description:       mod.description ?? undefined,
    level:             (mod.level as ModuleImport['level']) ?? 'beginner',
    gamification_type: (mod.gamification_type as ModuleImport['gamification_type']) ?? 'mimo',
    topics: mod.topics.map((topic) => {
      // Extract learningPath nodes and reverse-map to our schema
      const lc = topic.lesson_content as { learningPath?: unknown[] } | null;
      const rawNodes = lc?.learningPath ?? [];

      const nodes: NodeImport[] = rawNodes.map((n: unknown, idx: number) => {
        const node = n as Record<string, unknown>;
        // Reverse-map engine type → our type
        const typeRevMap: Record<string, NodeImport['type']> = {
          lesson:    'theory',
          quiz:      'quiz',
          challenge: 'challenge',
          code:      'code',
          practice:  'practice',
        };
        const rawType = (node.type as string) ?? 'lesson';
        return {
          node_id:        (node.id as string) ?? `node-${idx + 1}`,
          order:          idx,
          type:           typeRevMap[rawType] ?? 'theory',
          title:          (node.title as string) ?? '',
          content:        (node.explanation as string) ?? (node.content as string) ?? undefined,
          instructions:   (node.instructions as string) ?? undefined,
          options:        Array.isArray(node.options) ? (node.options as string[]) : undefined,
          correct_option: (node.correctOption as string) ?? undefined,
          xp:             typeof node.xp === 'number' ? node.xp : 0,
          code_content:   (node.code as Record<string, string> | undefined)?.content,
          code_language:  (node.code as Record<string, string> | undefined)?.language,
        };
      });

      return {
        topic_title:  topic.title,
        topic_order:  topic.order_index,
        description:  topic.description ?? undefined,
        project_link: topic.project_link ?? undefined,
        nodes,
      };
    }),
  }));

  return { success: true, data: payload };
}

// ── deleteModule ──────────────────────────────────────────────────────────────

export async function deleteModule(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID modul tidak valid.' };

  const db = createSupabaseAdminClient();

  const { data: topics } = await (db
    .from('topics').select('id').eq('module_id', id) as unknown as Promise<{
      data: Array<{ id: number }>;
      error: unknown;
    }>);

  const topicIds = (topics ?? []).map((t) => t.id);

  if (topicIds.length > 0) {
    await (db.from('challenges').delete().in('topic_id', topicIds) as unknown as Promise<unknown>);
    const { data: quizzes } = await (db
      .from('quizzes').select('id').in('topic_id', topicIds) as unknown as Promise<{
        data: Array<{ id: number }>;
        error: unknown;
      }>);
    const quizIds = (quizzes ?? []).map((q) => q.id);
    if (quizIds.length) await (db.from('quiz_questions').delete().in('quiz_id', quizIds) as unknown as Promise<unknown>);
    if (quizIds.length) await (db.from('quizzes').delete().in('id', quizIds) as unknown as Promise<unknown>);
    await (db.from('topics').delete().in('id', topicIds) as unknown as Promise<unknown>);
  }

  const { error } = await (db
    .from('modules').delete().eq('id', id) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true, message: 'Modul berhasil dihapus.' };
}

// ── deleteTopic ───────────────────────────────────────────────────────────────

export async function deleteTopic(
  _prev: CurriculumActionResult | null,
  formData: FormData
): Promise<CurriculumActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID topik tidak valid.' };

  const db = createSupabaseAdminClient();
  await (db.from('challenges').delete().eq('topic_id', id) as unknown as Promise<unknown>);
  const { error } = await (db
    .from('topics').delete().eq('id', id) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true, message: 'Topik berhasil dihapus.' };
}
