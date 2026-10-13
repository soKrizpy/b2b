'use client';
// src/features/dashboard/teacher/TeacherStudentsWidget.tsx
// Displays the list of mentored students for the logged-in teacher.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, GraduationCap, Coins, Sparkles, BookOpen, MessageCircle, ExternalLink, Users } from 'lucide-react';
import type { TeacherStudentCardData } from '@/features/users/queries';

interface Props {
  students: TeacherStudentCardData[];
}

export function TeacherStudentsWidget({ students }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email_or_phone.toLowerCase().includes(q) ||
        (s.grade && s.grade.toLowerCase().includes(q)) ||
        (s.active_module && s.active_module.toLowerCase().includes(q))
    );
  }, [students, search]);

  return (
    <section className="bg-white dark:bg-[#161622] rounded-3xl p-6 sm:p-7 shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 flex items-center justify-center text-lg flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Siswa Bimbingan Saya
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                {students.length} Siswa
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pantau progres belajar, modul aktif, dan pencapaian siswa Anda
            </p>
          </div>
        </div>

        {/* Search */}
        {students.length > 0 && (
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kelas…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs
                bg-slate-50 dark:bg-[#0f0f1a] text-slate-900 dark:text-white
                border border-slate-200 dark:border-white/10
                focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {students.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            Belum Ada Siswa Bimbingan Terdaftar
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Admin dapat mendaftarkan siswa ke akun Anda di menu Manajemen Pengguna, atau Anda dapat membuat jadwal sesi bimbingan pertama.
          </p>
          <Link
            href="/teacher/submissions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm active:scale-95"
          >
            Review Tugas Siswa
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-6 text-center">
          Tidak ada siswa bimbingan yang cocok dengan pencarian &ldquo;{search}&rdquo;.
        </p>
      ) : (
        /* Students Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((s) => {
            const isPhone = !s.email_or_phone.includes('@') && /^\d+$/.test(s.email_or_phone.replace(/\D/g, ''));
            const cleanPhone = s.email_or_phone.replace(/\D/g, '');
            const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
            const contactUrl = isPhone ? `https://wa.me/${waNumber}` : `mailto:${s.email_or_phone}`;

            return (
              <div
                key={s.id}
                className="rounded-2xl p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10
                  hover:border-violet-500/30 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 group"
              >
                {/* Top row: Avatar & Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    {s.full_name[0]?.toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {s.full_name}
                      </h3>
                      {s.grade && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          Kelas {s.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {s.email_or_phone}
                    </p>
                  </div>
                </div>

                {/* Module status */}
                <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f0f1a] border border-slate-200/60 dark:border-white/5 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-500" /> Modul Aktif
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {s.active_module ?? 'Belum ada modul aktif'}
                  </p>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                      <Sparkles className="w-3 h-3" /> {s.total_xp} XP
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      <Coins className="w-3 h-3" /> {s.coins}
                    </span>
                  </div>

                  {contactUrl && (
                    <a
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold
                        bg-violet-600/10 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white transition-all"
                    >
                      {isPhone ? <MessageCircle className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                      Kontak
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
