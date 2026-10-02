// src/features/curriculum/validation.ts
// Zod schemas and inferred types for the curriculum JSON import/export format.
// Imported by both the 'use server' actions file and client components.
// Contains NO server-only imports.

import { z } from 'zod';

// ── Node schema ───────────────────────────────────────────────────────────────

export const nodeSchema = z.object({
  node_id:        z.string().min(1, 'node_id wajib diisi'),
  order:          z.number().int().min(0),
  type:           z.enum(['theory', 'quiz', 'challenge', 'code', 'practice', 'lesson']),
  title:          z.string().min(1),
  content:        z.string().optional(),
  code_content:   z.string().optional(),
  code_language:  z.string().optional(),
  options:        z.array(z.string()).optional(),
  correct_option: z.string().optional(),
  instructions:   z.string().optional(),
  xp:             z.number().int().min(0).default(0),
});

// ── Topic schema ──────────────────────────────────────────────────────────────

export const topicImportSchema = z.object({
  topic_title:  z.string().min(1, 'topic_title wajib diisi').max(200),
  topic_order:  z.number().int().min(0),
  description:  z.string().optional(),
  project_link: z.string().url().optional().or(z.literal('')),
  nodes:        z.array(nodeSchema).default([]),
});

// ── Module schema ─────────────────────────────────────────────────────────────

export const moduleImportSchema = z.object({
  module_title:      z.string().min(1, 'module_title wajib diisi').max(200),
  module_order:      z.number().int().min(0),
  description:       z.string().optional(),
  level:             z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  gamification_type: z.enum(['mimo', 'duolingo', 'boardgame', 'quest', 'flashcard']).default('mimo'),
  topics:            z.array(topicImportSchema).default([]),
});

// ── Top-level schema — accepts array OR single module object ─────────────────

export const curriculumJsonSchema = z.union([
  z.array(moduleImportSchema).min(1, 'JSON harus berisi minimal satu modul'),
  moduleImportSchema.transform((m) => [m]),
]);

// ── Inferred types ────────────────────────────────────────────────────────────

export type CurriculumJsonInput = z.infer<typeof curriculumJsonSchema>;
export type ModuleImport        = z.infer<typeof moduleImportSchema>;
export type TopicImport         = z.infer<typeof topicImportSchema>;
export type NodeImport          = z.infer<typeof nodeSchema>;
