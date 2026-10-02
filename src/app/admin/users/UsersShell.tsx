'use client';
// src/app/admin/users/UsersShell.tsx
// Client shell — tab switching (Siswa / Guru) + collapsible add forms.
import { useState } from 'react';
import { AddStudentForm } from '@/features/users/components/AddStudentForm';
import { AddTeacherForm } from '@/features/users/components/AddTeacherForm';
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton';
import type { StudentRecord, TeacherRecord } from '@/features/users/queries';

type Tab = 'students' | 'teachers';

interface Props {
  students: StudentRecord[];
  teachers: TeacherRecord[];
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${color}`}>
      {children}
    </span>
  );
}

export function UsersShell({ students, teachers }: Props) {
  const [tab,          setTab]     = useState<Tab>('students');
  const [showAddForm,  setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Tab bar + CTA ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1
          bg-slate-100 dark:bg-white/8 p-1 rounded-xl
          ring-1 ring-slate-200/60 dark:ring-white/8">
          {([
            { id: 'students', label: 'Siswa',  count: students.length, icon: '🎓' },
            { id: 'teachers', label: 'Guru',   count: teachers.length, icon: '📚' },
          ] as const).map(({ id, label, count, icon }) => (
            <button key={id} type="button" onClick={() => { setTab(id); setShowAdd(false); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5
                ${tab === id
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}>
              <span>{icon}</span>
              {label}
              <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full
                ${tab === id
                  ? 'bg-slate-100 dark:bg-white/15 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button type="button" onClick={() => setShowAdd((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
            transition-all shadow-sm
            ${tab === 'students'
              ? 'bg-[#7cc62f] hover:bg-[#5fa31f] text-white shadow-[#7cc62f]/30'
              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200/40 dark:shadow-violet-900/40'
            }`}>
          {showAddForm
            ? '✕ Tutup Form'
            : tab === 'students' ? '+ Tambah Siswa' : '+ Tambah Guru'}
        </button>
      </div>

      {/* ── Add form (collapsible) ─────────────────────────── */}
      {showAddForm && (
        <div className="bg-white dark:bg-[var(--surface)] rounded-2xl
          ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm p-5 animate-fade-in-up">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
            {tab === 'students' ? '🎓 Tambah Siswa Baru' : '📚 Tambah Guru Baru'}
          </h2>
          {tab === 'students'
            ? <AddStudentForm onSuccess={() => setShowAdd(false)} />
            : <AddTeacherForm onSuccess={() => setShowAdd(false)} />
          }
        </div>
      )}

      {/* ── Student list ──────────────────────────────────── */}
      {tab === 'students' && (
        <div className="flex flex-col gap-3">
          {students.length === 0 ? (
            <EmptyState icon="🎓" message="Belum ada siswa terdaftar." />
          ) : (
            students.map((s) => (
              <div key={s.id}
                className="bg-white dark:bg-[var(--surface)] rounded-2xl
                  ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm
                  px-5 py-4 flex items-start gap-4 hover:shadow-md
                  transition-all duration-200 animate-fade-in-up">
                {/* Avatar initial */}
                <div className="w-10 h-10 rounded-xl bg-[#7cc62f]/15 dark:bg-[#7cc62f]/20
                  flex items-center justify-center flex-shrink-0 text-lg font-black
                  text-[#5fa31f] dark:text-[#a3e05a]">
                  {s.full_name[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {s.full_name}
                    </p>
                    {s.grade && (
                      <Badge color="bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700/40">
                        {s.grade}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.email_or_phone}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* XP + Coins */}
                    <Badge color="bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/40">
                      ⭐ {s.total_xp} XP
                    </Badge>
                    <Badge color="bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/40">
                      🪙 {s.coins}
                    </Badge>

                    {/* Active modules */}
                    {s.module_titles.map((t) => (
                      <Badge key={t} color="bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/40">
                        📖 {t}
                      </Badge>
                    ))}

                    {s.module_titles.length === 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Belum ada modul aktif
                      </span>
                    )}
                  </div>
                </div>

                <DeleteUserButton userId={s.id} role="student" name={s.full_name} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Teacher list ──────────────────────────────────── */}
      {tab === 'teachers' && (
        <div className="flex flex-col gap-3">
          {teachers.length === 0 ? (
            <EmptyState icon="📚" message="Belum ada guru terdaftar." />
          ) : (
            teachers.map((t) => (
              <div key={t.id}
                className="bg-white dark:bg-[var(--surface)] rounded-2xl
                  ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm
                  px-5 py-4 flex items-start gap-4 hover:shadow-md
                  transition-all duration-200 animate-fade-in-up">
                {/* Avatar initial */}
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30
                  flex items-center justify-center flex-shrink-0 text-lg font-black
                  text-violet-600 dark:text-violet-300">
                  {(t.full_name ?? '?')[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {t.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.email ?? 'Email tidak tersedia'}
                  </p>
                  {t.created_at && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Bergabung {new Date(t.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <DeleteUserButton userId={t.id} role="teacher" name={t.full_name ?? t.email ?? t.id} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl
      border-2 border-dashed border-slate-200 dark:border-white/10
      bg-white dark:bg-white/3 py-16 px-6 text-center">
      <span className="text-4xl mb-3" aria-hidden="true">{icon}</span>
      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{message}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Klik tombol &ldquo;Tambah&rdquo; di atas untuk menambahkan.
      </p>
    </div>
  );
}
