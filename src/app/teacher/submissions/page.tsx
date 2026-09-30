// src/app/teacher/submissions/page.tsx
// Teacher: review student challenge submissions.
import type { Metadata } from 'next';
import { getAllSubmissions } from '@/features/challenges/queries';
import { ReviewForm } from '@/features/challenges/components/ReviewForm';

export const metadata: Metadata = { title: 'Review Submissions — Bits2Bytes' };
export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  pending:        'bg-amber-100 text-amber-800',
  approved:       'bg-green-100 text-green-800',
  needs_revision: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<string, string> = {
  pending:        'Menunggu Review',
  approved:       'Disetujui',
  needs_revision: 'Perlu Revisi',
};

export default async function TeacherSubmissionsPage() {
  const submissions = await getAllSubmissions();

  const pending   = submissions.filter((s) => s.status === 'pending');
  const reviewed  = submissions.filter((s) => s.status !== 'pending');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Review Submissions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {pending.length} menunggu review · {reviewed.length} sudah diproses
        </p>
      </div>

      {/* Pending */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Menunggu Review ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 text-sm">
            Semua submission sudah diproses 🎉
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((sub) => (
              <div key={sub.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {sub.challenge?.title ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sub.student_name ?? '—'} · {sub.student_email ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dikirim {new Date(sub.submitted_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[sub.status]}`}>
                      {STATUS_LABEL[sub.status]}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">
                  {/* Submission proof */}
                  {sub.submission_url ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Bukti submission:</p>
                      <a href={sub.submission_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline break-all">
                        {sub.submission_url}
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Tidak ada link submission.</p>
                  )}

                  {/* Student note */}
                  {sub.submission_note && (
                    <div className="bg-slate-50 rounded px-3 py-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Catatan siswa: </span>
                      {sub.submission_note}
                    </div>
                  )}

                  {/* Review form */}
                  <ReviewForm submissionId={sub.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviewed history */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Riwayat ({reviewed.length})
          </h2>
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden divide-y divide-slate-100">
            {reviewed.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {sub.challenge?.title ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {sub.student_name ?? '—'} · {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[sub.status]}`}>
                  {STATUS_LABEL[sub.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
