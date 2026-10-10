'use client';
// src/features/users/components/TeacherDetailModal.tsx
// Slide-over detail panel for a single teacher.
// Shows: stats (sessions, students), email+access, and password reset.

import { useState, useActionState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { resetTeacherPassword, type ResetPasswordResult } from '@/features/users/actions';
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton';
import type { TeacherRecord } from '@/features/users/queries';

interface Props {
  teacher: TeacherRecord;
  onClose: () => void;
}

// ── Stat card ────────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon }: { value: number | string; label: string; icon: string }) {
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

// ── Password reset form ────────────────────────────────────────────────────────────

function PasswordResetForm({ teacherId }: { teacherId: string }) {
  const [show, setShow] = useState(false);
  const [result, dispatch, pending] = useActionState<ResetPasswordResult | null, FormData>(
    resetTeacherPassword,
    null,
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
        Reset Password Akses
      </p>

      <form action={dispatch} className="flex flex-col gap-2">
        <input type="hidden" name="teacher_id" value={teacherId} />

        {/* Current password display (masked) */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
          bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">🔒 Password</span>
          <span className="flex-1 font-mono text-sm text-slate-400 dark:text-slate-500 tracking-widest">
            &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold
            bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
            Tersembunyi
          </span>
        </div>

        {/* New password input */}
        <div className="relative">
          <input
            name="new_password"
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="Password baru (min. 8 karakter)"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl text-sm
              bg-white dark:bg-[#0f0f1a] text-slate-900 dark:text-white
              border border-slate-200 dark:border-white/15
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white
              transition-colors"
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-xl text-xs font-extrabold
            bg-violet-600 hover:bg-violet-700 text-white
            disabled:opacity-50 active:scale-95 transition-all duration-150"
        >
          {pending ? 'Menyimpan…' : '🔄 Perbarui Password'}
        </button>
      </form>

      {/* Feedback */}
      {result && (
        <p className={`text-xs px-3 py-2 rounded-xl border ${
          result.success
            ? 'bg-emerald-500/8 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
            : 'bg-red-500/8 text-red-700 border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
        }`}>
          {result.success ? `✓ ${result.message}` : `✗ ${result.error}`}
        </p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────────────

export function TeacherDetailModal({ teacher: t, onClose }: Props) {
  const [closeTriggered, setCloseTriggered] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600
            flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-md">
            {(t.full_name ?? '?')[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t.full_name ?? '—'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-violet-500/10 text-violet-700 border border-violet-500/25
                dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30">
                Guru
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.email ?? 'Email tidak tersedia'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Terdaftar: {t.created_at
                ? new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              }
            </p>
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
          <StatCard value={t.session_count} label="Sesi Ditugaskan" icon="📅" />
          <StatCard value={t.student_count} label="Siswa Terdaftar"  icon="🎓" />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 flex flex-col gap-5">

          {/* Access / Email row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
              Akses Login
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl
              bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span className="text-base" aria-hidden="true">📧</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {t.email ?? 'Tidak tersedia'}
                </p>
              </div>
            </div>
          </div>

          {/* Password reset */}
          <PasswordResetForm teacherId={t.id} />

          {/* Danger zone */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/8">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-500/70 px-1">
              Zona Berbahaya
            </p>
            <div className="flex items-center gap-3">
              <DeleteUserButton
                userId={t.id}
                role="teacher"
                name={t.full_name ?? t.email ?? t.id}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Hapus akun guru secara permanen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
