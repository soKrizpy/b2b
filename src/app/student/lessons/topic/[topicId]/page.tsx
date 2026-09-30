// src/app/student/lessons/topic/[topicId]/page.tsx
// Student: topic viewer with challenge submission forms.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTopicById } from '@/features/curriculum/queries';
import { getChallengesWithSubmissions } from '@/features/challenges/queries';
import { SubmitChallengeForm } from '@/features/challenges/components/SubmitChallengeForm';

export const metadata: Metadata = { title: 'Topik — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ topicId: string }> };

const STATUS_BADGE: Record<string, string> = {
  pending:        'bg-amber-100 text-amber-800',
  approved:       'bg-green-100 text-green-800',
  needs_revision: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<string, string> = {
  pending:        'Menunggu Review',
  approved:       'Disetujui ✓',
  needs_revision: 'Perlu Revisi',
};

export default async function TopicPage({ params }: Props) {
  const { topicId } = await params;
  const id = Number(topicId);
  if (!id) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [topic, challenges] = await Promise.all([
    getTopicById(id),
    getChallengesWithSubmissions(id, user.id),
  ]);
  if (!topic) notFound();

  const completedCount  = challenges.filter((c) => c.submission?.status === 'approved').length;
  const progressPercent = challenges.length > 0
    ? Math.round((completedCount / challenges.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link href="/student/lessons" className="text-sm text-slate-500 hover:text-slate-700">
        ← Kembali ke Pelajaran
      </Link>

      {/* Topic header */}
      <div className="border border-slate-200 rounded-xl bg-white px-5 py-5">
        <h1 className="text-xl font-bold text-slate-900">{topic.title}</h1>

        {/* Progress bar */}
        {challenges.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{completedCount}/{challenges.length} challenge selesai</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {topic.description && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Instruksi</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {topic.description}
            </p>
          </div>
        )}

        {/* Project link */}
        {topic.project_link && (
          <a href={topic.project_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-indigo-600 hover:underline">
            Buka Link Project →
          </a>
        )}
      </div>

      {/* Challenges */}
      {challenges.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          Belum ada challenge untuk topik ini.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800">Challenges ({challenges.length})</h2>
          {challenges.map((ch, idx) => (
            <div key={ch.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{ch.title}</h3>
                    {ch.instructions && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                        {ch.instructions}
                      </p>
                    )}
                  </div>
                </div>
                {ch.submission?.status && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                    STATUS_BADGE[ch.submission.status]
                  }`}>
                    {STATUS_LABEL[ch.submission.status]}
                  </span>
                )}
              </div>
              <div className="px-5 py-4">
                <SubmitChallengeForm challenge={ch} existingSubmission={ch.submission} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
