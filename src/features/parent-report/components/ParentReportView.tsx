// src/features/parent-report/components/ParentReportView.tsx
// Server Component — renders the parent report for a validated token.
// No auth required; data is already validated and token-gated by the page.

import { formatDate, formatDateTime } from '@/lib/formatDate';
import type { ParentReportData } from '../queries';

interface ParentReportViewProps {
  data: ParentReportData;
}

export function ParentReportView({ data }: ParentReportViewProps) {
  const { studentName, completedSessions, completedTopics, totalSessions, totalTopics, totalXp } = data;

  return (
    <div className="space-y-8">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-7 text-white shadow-lg">
        <p className="text-indigo-200 text-sm font-medium mb-1">Laporan Perkembangan</p>
        <h1 className="text-2xl font-extrabold">{studentName}</h1>
        <p className="mt-1 text-indigo-100 text-sm">
          Dibagikan secara aman · Hanya dapat diakses dengan tautan khusus ini
        </p>

        {/* Summary strip */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Kelas Selesai', value: totalSessions, icon: '🎓' },
            { label: 'Materi Selesai', value: totalTopics,   icon: '📚' },
            { label: 'Total XP',      value: totalXp,        icon: '⭐' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white/15 rounded-xl px-3 py-3 text-center backdrop-blur-sm">
              <div className="text-xl mb-0.5">{icon}</div>
              <div className="text-2xl font-extrabold">{value}</div>
              <div className="text-xs text-indigo-100 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Completed sessions ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-lg">🗓</span> Riwayat Kelas
        </h2>

        {completedSessions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-10 text-center">
            <p className="text-slate-400 text-sm">Belum ada kelas yang selesai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{session.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(session.meeting_date)}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    ✓ Selesai
                  </span>
                </div>

                {session.progress_report && (
                  <div className="px-5 py-3 bg-slate-50/60">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Catatan Guru
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {session.progress_report}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Completed topics (engine lessons) ────────────────────────────── */}
      {completedTopics.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📖</span> Materi Interaktif yang Diselesaikan
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completedTopics.map((topic) => (
              <div
                key={topic.engine_topic_id}
                className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm px-5 py-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center text-lg">
                  ⭐
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {topic.topic_title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(topic.completed_at)} · XP {topic.xp_earned} · Quiz {topic.best_quiz_score}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-slate-400 pt-4 pb-8 border-t border-slate-100">
        <p>
          Laporan ini dibuat otomatis oleh{' '}
          <span className="font-semibold text-slate-600">Bits2Bytes LMS</span>.
        </p>
        <p className="mt-1">
          Hanya dapat diakses dengan tautan khusus yang dikirim oleh pengajar.
        </p>
      </footer>
    </div>
  );
}
