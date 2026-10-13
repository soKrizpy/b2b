// src/app/student/lessons/page.tsx
// 🗺️ Quest Map — 4-state node progression with inline quiz trigger.
// Node states: COMPLETED | NEEDS_QUIZ | ACTIVE_NEXT | LOCKED | FINAL_BOSS
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { getStudentCertificates, TIER_CONFIG } from '@/features/certificates/queries';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import { QuestMapClient } from '@/app/student/lessons/QuestMapClient';

export const metadata: Metadata = { title: '🗺️ Quest Map — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function QuestMapPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [allModules, certificates] = await Promise.all([
    getStudentModulesWithTopics(user.id),
    getStudentCertificates(user.id),
  ]);

  const mod = allModules[0] ?? null;

  if (!mod) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <QuestHeader />
        <EmptyQuestState />
      </div>
    );
  }

  const questData  = await getQuestMapData(user.id, mod);
  const cert       = certificates.find((c) => c.module_id === mod.id) ?? null;
  const totalCount = mod.topics.length;
  const completedCount = questData.nodes.filter((n) => n.status === 'COMPLETED').length;
  const pct        = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const LEVEL_COLOR: Record<string, string> = {
    beginner:     'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    intermediate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    advanced:     'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  };
  const levelColor = LEVEL_COLOR[mod.level ?? ''] ?? LEVEL_COLOR.beginner;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <QuestHeader />

      {/* ── Module banner ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br
        from-slate-900 via-indigo-950 to-zinc-950
        border border-blue-500/40 dark:border-purple-500/40
        p-6 text-white shadow-xl shadow-indigo-950/30">
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider
                px-2.5 py-0.5 rounded-full border ${levelColor}`}>
                {mod.level}
              </span>
              {cert && (
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border
                  ${TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].bg}
                  ${TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].color}
                  ${TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].ring}`}>
                  {TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].medal} {cert.score}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">{mod.title}</h2>
            {mod.description && !mod.description.startsWith('FINAL_ASSESSMENT:') && (
              <p className="mt-1 text-sm text-slate-300 line-clamp-2 font-medium">{mod.description}</p>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-0.5
            bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3
            border border-white/15 min-w-[100px]">
            <span className="text-2xl font-black tabular-nums text-cyan-300">{pct}%</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-300">Selesai</span>
            <span className="text-[10px] font-semibold text-slate-400">{completedCount}/{totalCount} topik</span>
          </div>
        </div>

        <div className="relative z-10 mt-5 h-2.5 rounded-full bg-white/15 overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700
              ${questData.moduleComplete
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                : 'bg-gradient-to-r from-cyan-400 to-purple-400'
              }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Quest Map client (handles modal open/close) ── */}
      <QuestMapClient
        questData={questData}
        cert={cert}
        studentId={user.id}
      />
    </div>
  );
}

// ── Static sub-components ─────────────────────────────────────────────────────

function QuestHeader() {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest
        text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1.5">
        <i className="fa-solid fa-map-location-dot text-cyan-400" /> Quest Map
      </p>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
        Perjalanan Belajarmu
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
        Selesaikan setiap topik untuk membuka yang berikutnya.
      </p>
    </div>
  );
}

function EmptyQuestState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed
      border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16 px-6 text-center shadow-sm">
      <span className="text-6xl select-none">🗺️</span>
      <div>
        <p className="font-black text-slate-800 dark:text-white text-lg">
          Belum ada modul aktif
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto font-medium">
          Gurumu belum mengaktifkan modul untukmu. Petualanganmu segera dimulai!
        </p>
      </div>
    </div>
  );
}
