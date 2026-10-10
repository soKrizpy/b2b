'use client';
// src/features/users/components/StudentDetailModal.tsx
// Slide-over detail panel for a single student.
// Tabs: Learning Path (assign active module) | Riwayat | Pencapaian | Sertifikat

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveStudentModule, type SetModuleResult } from '@/features/users/actions';
import type { StudentRecord, AssignedModule } from '@/features/users/queries';
import type { ModuleRow } from '@/types/database';

interface Props {
  student:    StudentRecord;
  allModules: ModuleRow[];
  onClose:    () => void;
}

type Tab = 'path' | 'history' | 'achievement' | 'certificate';

// ── helpers ───────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',
  intermediate: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40',
  advanced:     'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-700/40',
};

function LevelBadge({ level }: { level: string | null }) {
  const color = LEVEL_COLOR[level ?? ''] ?? 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/15';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${color}`}>
      {level ?? 'N/A'}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0 py-3">
      <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center leading-tight">
        {label}
      </span>
      <span className="text-base" aria-hidden="true">{icon}</span>
    </div>
  );
}

// ── Tab: Learning Path (with module assign control) ──────────────────────────

function LearningPathTab({
  student,
  allModules,
}: {
  student: StudentRecord;
  allModules: ModuleRow[];
}) {
  const router = useRouter();
  const [result, dispatch, pending] = useActionState<SetModuleResult | null, FormData>(
    setActiveStudentModule,
    null,
  );

  // Refresh page data after successful assign
  useEffect(() => {
    if (result?.success) router.refresh();
  }, [result, router]);

  const activeModule = student.modules.find((m) => m.status === 'active');

  // Modules not yet assigned to this student at all
  const assignedIds = new Set(student.modules.map((m) => m.module_id));
  const unassigned  = allModules.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* ── Currently assigned modules ── */}
      {student.modules.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide
            text-slate-400 dark:text-slate-500 mb-2 px-1">
            Modul Terdaftar
          </p>
          <ul className="flex flex-col gap-2">
            {student.modules.map((m) => {
              const isActive = m.status === 'active';
              return (
                <li key={m.module_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border
                    transition-all duration-150
                    ${isActive
                      ? 'bg-emerald-500/8 border-emerald-500/25 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                      : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10'
                    }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0
                    ${isActive ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-white min-w-0 truncate">
                    {m.title}
                  </span>
                  <LevelBadge level={m.level} />
                  {isActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0
                      bg-emerald-100 text-emerald-700 ring-emerald-200
                      dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/40">
                      ✓ Aktif
                    </span>
                  ) : (
                    /* Activate button for paused modules */
                    <form action={dispatch}>
                      <input type="hidden" name="student_id" value={student.id} />
                      <input type="hidden" name="module_id"  value={m.module_id} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0
                          bg-white text-indigo-600 ring-indigo-200 hover:bg-indigo-50
                          dark:bg-white/5 dark:text-indigo-400 dark:ring-indigo-700/40
                          dark:hover:bg-indigo-900/20
                          disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {pending ? '…' : 'Aktifkan'}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">📚</span>
          <p className="font-bold text-slate-700 dark:text-slate-100 text-sm">Belum Ada Modul</p>
          <p className="text-xs text-slate-400 dark:text-slate-400 max-w-[200px]">
            Pilih modul di bawah untuk mengaktifkan.
          </p>
        </div>
      )}

      {/* ── Assign new module (from unassigned list) ── */}
      {unassigned.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide
            text-slate-400 dark:text-slate-500 mb-2 px-1">
            Tambah &amp; Aktifkan Modul Baru
          </p>
          <form action={dispatch} className="flex items-center gap-2">
            <input type="hidden" name="student_id" value={student.id} />
            <select
              name="module_id"
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/15
                px-3 py-2 text-xs font-medium
                bg-white dark:bg-[var(--surface)] text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Pilih modul —</option>
              {unassigned.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.level ? `(${m.level})` : ''}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold
                bg-indigo-600 hover:bg-indigo-700 text-white
                disabled:opacity-50 transition-colors"
            >
              {pending ? '…' : '+ Aktifkan'}
            </button>
          </form>
        </div>
      )}

      {/* ── Action feedback ── */}
      {result && (
        <p className={`text-xs px-3 py-2 rounded-xl ring-1 ${
          result.success
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:ring-emerald-700/40'
            : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/10 dark:text-red-300 dark:ring-red-700/40'
        }`}>
          {result.success ? `✓ ${result.message}` : `✗ ${result.error}`}
        </p>
      )}

      {/* Note on active module behaviour */}
      {activeModule && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1 leading-relaxed">
          Quest Map siswa menampilkan modul aktif:{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {activeModule.title}
          </span>. Mengaktifkan modul lain akan menjeda yang ini.
        </p>
      )}
    </div>
  );
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="text-5xl" aria-hidden="true">{icon}</span>
      <p className="font-bold text-slate-700 dark:text-white text-sm">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Fitur ini akan segera tersedia.
      </p>
    </div>
  );
}

// ── Title badge (based on XP level) ──────────────────────────────────────────

function titleFromXp(xp: number): string {
  if (xp >= 5000) return 'Expert Coder';
  if (xp >= 2000) return 'Senior Coder';
  if (xp >= 800)  return 'Junior Coder';
  return 'Novice Coder';
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'path',        label: 'Learning Path', icon: '📖' },
  { id: 'history',     label: 'Riwayat',       icon: '📋' },
  { id: 'achievement', label: 'Pencapaian',    icon: '🏅' },
  { id: 'certificate', label: 'Sertifikat',    icon: '🎖' },
];

export function StudentDetailModal({ student: s, allModules, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('path');

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
        bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#1a1a28]
          sm:rounded-3xl rounded-t-3xl shadow-2xl
          flex flex-col max-h-[90dvh] overflow-hidden
          border-0 dark:border dark:border-white/10
          animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-5 pt-5 pb-4
          border-b border-slate-100 dark:border-white/8 flex-shrink-0">

          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
            flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-md">
            {s.full_name[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {s.full_name}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-violet-100 text-violet-700 ring-1 ring-violet-200
                dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40">
                {titleFromXp(s.total_xp)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {s.email_or_phone}
              {s.grade ? ` · ${s.grade}` : ''}
            </p>
            {/* MPIN visible */}
            <div className="mt-1.5 inline-flex items-center gap-1.5
              bg-slate-100 dark:bg-white/8 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">🔑 MPIN</span>
              <span className="text-xs font-mono font-bold tracking-widest
                text-slate-700 dark:text-slate-200">
                {s.mpin}
              </span>
            </div>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl
              bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white
              flex items-center justify-center text-sm font-bold transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="flex items-stretch divide-x divide-slate-100 dark:divide-white/8
          border-b border-slate-100 dark:border-white/8 flex-shrink-0">
          <StatCard value={s.modules.length}  label="Modul"      icon="📖" />
          <StatCard value={s.session_count}   label="Pertemuan Hadir" icon="📅" />
          <StatCard value={s.quiz_count}      label="Quiz"       icon="🧠" />
          <StatCard value={s.cert_count}      label="Sertifikat" icon="🎖" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 overflow-x-auto flex-shrink-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                whitespace-nowrap transition-all duration-150
                ${tab === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2">
          {tab === 'path'        && <LearningPathTab student={s} allModules={allModules} />}
          {tab === 'history'     && <PlaceholderTab icon="📋" label="Riwayat Pertemuan" />}
          {tab === 'achievement' && <PlaceholderTab icon="🏅" label="Pencapaian & Badge" />}
          {tab === 'certificate' && <PlaceholderTab icon="🎖" label="Sertifikat Siswa" />}
        </div>
      </div>
    </div>
  );
}
