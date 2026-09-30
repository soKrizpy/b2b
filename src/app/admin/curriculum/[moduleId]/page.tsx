// src/app/admin/curriculum/[moduleId]/page.tsx
// Admin: detailed module editor — topics + challenges + inline forms.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleById, getTopicsByModuleId } from '@/features/curriculum/queries';
import { getChallengesByTopicId } from '@/features/challenges/queries';
import { ModuleEditorClient } from './ModuleEditorClient';

export const metadata: Metadata = { title: 'Edit Modul — Admin' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ moduleId: string }> };

export default async function ModuleEditorPage({ params }: Props) {
  const { moduleId } = await params;
  const id = Number(moduleId);
  if (!id) notFound();

  const [mod, topics] = await Promise.all([
    getModuleById(id),
    getTopicsByModuleId(id),
  ]);
  if (!mod) notFound();

  // Fetch challenges for each topic in parallel
  const challengesByTopic = await Promise.all(
    topics.map(async (t) => ({ topicId: t.id, challenges: await getChallengesByTopicId(t.id) }))
  );
  const challengeMap = Object.fromEntries(
    challengesByTopic.map(({ topicId, challenges }) => [topicId, challenges])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/curriculum" className="text-sm text-slate-500 hover:text-slate-700">
            ← Kembali ke Kurikulum
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{mod.title}</h1>
          <p className="text-sm text-slate-500">{topics.length} topik</p>
        </div>
      </div>

      <ModuleEditorClient
        module={mod}
        topics={topics}
        challengeMap={challengeMap}
      />
    </div>
  );
}
