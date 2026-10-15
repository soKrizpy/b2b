// src/app/admin/curriculum/[moduleId]/page.tsx
// Module Builder — per-module JSON import/export, topic list with delete.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleById, getTopicsByModuleId } from '@/features/curriculum/queries';
import { ModuleBuilderClient } from './ModuleBuilderClient';
import { extractFinalAssessment } from '@/features/curriculum/validation';
import type { TopicWithChallengeCount, ModuleWithTopics } from '@/features/curriculum/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ moduleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleId } = await params;
  const mod = await getModuleById(Number(moduleId));
  return { title: `${mod?.title ?? 'Modul'} — Builder` };
}

export default async function ModuleBuilderPage({ params }: Props) {
  const { moduleId } = await params;
  const id = Number(moduleId);
  if (!id) notFound();

  const [mod, topics] = await Promise.all([
    getModuleById(id),
    getTopicsByModuleId(id),
  ]);
  if (!mod) notFound();

  const hasFinalAssessment = extractFinalAssessment(mod.description) !== null;

  // Build ModuleWithTopics shape for the client
  const moduleWithTopics: ModuleWithTopics = {
    ...mod,
    topics: topics.map((t) => ({ ...t, challenge_count: 0 }) as TopicWithChallengeCount),
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/curriculum"
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
          ← Kurikulum
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="font-semibold text-slate-800 dark:text-white truncate max-w-xs">
          {mod.title}
        </span>
      </nav>

      {/* Module header */}
      <div className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1
        ring-slate-200 dark:ring-white/10 shadow-sm px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold bg-slate-100 dark:bg-white/10
                text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full ring-1
                ring-slate-200 dark:ring-white/15">
                {mod.level}
              </span>
              <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30
                text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full ring-1
                ring-indigo-200 dark:ring-indigo-700/40">
                {mod.gamification_type}
              </span>
              {hasFinalAssessment && (
                <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20
                  text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ring-1
                  ring-amber-200 dark:ring-amber-700/40">
                  🏆 Tryout Terkonfigurasi
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{mod.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {topics.length} topik · Import JSON untuk menambah/memperbarui materi
            </p>
          </div>
        </div>
      </div>

      {/* Client builder */}
      <ModuleBuilderClient module={moduleWithTopics} />
    </div>
  );
}
