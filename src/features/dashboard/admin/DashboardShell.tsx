'use client';
// src/features/dashboard/admin/DashboardShell.tsx
// 2-Column SaaS Command Center layout for Admin Dashboard:
//   • Left column (lg:col-span-8): Filter tabs, search bar, + Buat Jadwal, curated meeting cards with pagination.
//   • Right column (lg:col-span-4): Aktivitas Terkini & Quick Nav Command Panel.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { AdminSessionActions } from '@/features/sessions/components/AdminSessionActions';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';
import { isLive, isUpcoming, formatDate, formatTime } from '@/lib/formatDate';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'upcoming' | 'live' | 'done' | 'all';

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'upcoming', label: 'Mendatang' },
  { id: 'live',     label: 'Live Sekarang' },
  { id: 'done',     label: 'Selesai' },
  { id: 'all',      label: 'Semua' },
];

interface Props {
  meetings: MeetingWithStudents[];
  teachers: TeacherOption[];
  students: StudentOption[];
}

const ITEMS_PER_PAGE = 6;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tabCount(meetings: MeetingWithStudents[], id: FilterTab): number {
  if (id === 'live')     return meetings.filter((m) => isLive(m.meeting_date)).length;
  if (id === 'upcoming') return meetings.filter((m) => !m.is_completed && isUpcoming(m.meeting_date) && !isLive(m.meeting_date)).length;
  if (id === 'done')     return meetings.filter((m) => m.is_completed).length;
  return meetings.length;
}

function filterMeetings(meetings: MeetingWithStudents[], tab: FilterTab, query: string): MeetingWithStudents[] {
  let list = meetings;
  if (tab === 'live')     list = meetings.filter((m) => isLive(m.meeting_date));
  else if (tab === 'upcoming') list = meetings.filter((m) => !m.is_completed && isUpcoming(m.meeting_date) && !isLive(m.meeting_date));
  else if (tab === 'done')     list = meetings.filter((m) => m.is_completed);

  if (!query.trim()) return list;

  const q = query.toLowerCase();
  return list.filter((m) => {
    const titleMatch = m.title.toLowerCase().includes(q);
    const notesMatch = m.notes?.toLowerCase().includes(q) ?? false;
    const studentMatch = m.meeting_students.some(
      (ms) => ms.students?.full_name.toLowerCase().includes(q)
    );
    return titleMatch || notesMatch || studentMatch;
  });
}

function activityLabel(m: MeetingWithStudents): string {
  if (m.is_completed) return `Kelas "${m.title}" selesai`;
  if (isLive(m.meeting_date)) return `Kelas "${m.title}" sedang berlangsung`;
  return `Jadwal baru: "${m.title}"`;
}

function activityIcon(m: MeetingWithStudents): string {
  if (m.is_completed)          return '✅';
  if (isLive(m.meeting_date))  return '🔴';
  return '📅';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardShell({ meetings, teachers, students }: Props) {
  // Default to 'upcoming' as requested to prevent dumping all 535 sessions
  const [tab, setTab] = useState<FilterTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => filterMeetings(meetings, tab, searchQuery),
    [meetings, tab, searchQuery]
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage]
  );

  // Recent activity: last 5 meetings sorted by meeting_date desc
  const recentActivity = useMemo(() => {
    return [...meetings]
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
      .slice(0, 5);
  }, [meetings]);

  const liveCount = useMemo(() => meetings.filter((m) => isLive(m.meeting_date)).length, [meetings]);
  const upcomingCount = useMemo(() => meetings.filter((m) => !m.is_completed && isUpcoming(m.meeting_date) && !isLive(m.meeting_date)).length, [meetings]);
  const doneCount = useMemo(() => meetings.filter((m) => m.is_completed).length, [meetings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      {/* ── Left Column: Main Agenda & Filtered Meetings (lg:col-span-8) ───── */}
      <div className="lg:col-span-8 flex flex-col gap-5">

        {/* Toolbar & Filter Tabs */}
        <div className="bg-white dark:bg-[var(--surface)] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl ring-1 ring-slate-200/60 dark:ring-white/10 flex-wrap">
            {TABS.map(({ id, label }) => {
              const count = tabCount(meetings, id);
              const isActive = tab === id;
              const isLiveId = id === 'live';

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setTab(id); setPage(1); }}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 select-none flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isLiveId && count > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {label}
                  {count > 0 && (
                    <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Right: Modal Trigger */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <CreateSessionModal teachers={teachers} students={students} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Cari berdasarkan judul, murid, atau catatan..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[var(--surface)] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Meeting Cards List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--surface)] py-14 px-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-2xl mb-3">
              📭
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Tidak ada jadwal ditemukan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {searchQuery ? `Tidak ada hasil cocok untuk "${searchQuery}".` : 'Ganti filter atau buat jadwal baru di atas.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {paginated.map((m) => {
              const live = isLive(m.meeting_date);
              const done = m.is_completed;
              const studentNames = m.meeting_students
                .map((ms) => ms.students?.full_name)
                .filter((n): n is string => Boolean(n));
              const materi = m.notes?.trim() || null;

              return (
                <div
                  key={m.id}
                  className={`bg-white dark:bg-[var(--surface)] rounded-2xl border transition-all duration-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md ${
                    live
                      ? 'border-red-300 dark:border-red-500/40 bg-gradient-to-r from-red-50/30 dark:from-red-950/10 to-transparent'
                      : done
                      ? 'border-slate-200/60 dark:border-slate-800/80 opacity-80'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Left: Date Badge */}
                  <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-0.5 bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl p-2.5 min-w-[76px] text-center flex-shrink-0 w-full sm:w-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {new Date(m.meeting_date).toLocaleDateString('id-ID', { month: 'short' })}
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                      {new Date(m.meeting_date).getDate()}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {formatTime(m.meeting_date)}
                    </span>
                  </div>

                  {/* Center: Meeting Info */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {m.title}
                      </h3>
                      {live && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                          ● LIVE
                        </span>
                      )}
                      {done && (
                        <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                          ✓ Selesai
                        </span>
                      )}
                      {m.session_count > 1 && (
                        <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          Sesi {m.session_number}/{m.session_count}
                        </span>
                      )}
                    </div>

                    {/* Chips Row: Students, Notes */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {studentNames.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {studentNames.slice(0, 3).map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/40"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#7cc62f] flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{name}</span>
                            </span>
                          ))}
                          {studentNames.length > 3 && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              +{studentNames.length - 3} murid
                            </span>
                          )}
                        </div>
                      )}

                      {materi && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 max-w-[200px]">
                          <span className="truncate">📚 {materi}</span>
                        </span>
                      )}
                    </div>

                    {/* Progress Report */}
                    {m.progress_report && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">
                        📝 {m.progress_report}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions aligned together */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {m.link_url ? (
                      <a
                        href={m.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                          live
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6.22 8.72a.75.75 0 001.06 1.06l1.69-1.69a3 3 0 000-4.24l-.69-.69a3 3 0 00-4.24 0l-.69.69a3 3 0 000 4.24l.75.75a.75.75 0 001.06-1.06l-.75-.75a1.5 1.5 0 010-2.12l.69-.69a1.5 1.5 0 012.12 0l.69.69a1.5 1.5 0 010 2.12l-1.69 1.69z"/>
                          <path d="M9.78 7.28a.75.75 0 00-1.06-1.06l-1.69 1.69a3 3 0 000 4.24l.69.69a3 3 0 004.24 0l.69-.69a3 3 0 000-4.24l-.75-.75a.75.75 0 00-1.06 1.06l.75.75a1.5 1.5 0 010 2.12l-.69.69a1.5 1.5 0 01-2.12 0l-.69-.69a1.5 1.5 0 010-2.12l1.69-1.69z"/>
                        </svg>
                        {live ? 'Join' : 'Buka'}
                      </a>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        ⚠ No link
                      </span>
                    )}

                    {/* Admin Action Icons */}
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                      <AdminSessionActions
                        meeting={m}
                        teachers={teachers}
                        students={students}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination & "Lihat Semua" Footer */}
        {filtered.length > 0 && (
          <div className="bg-white dark:bg-[var(--surface)] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> dari <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> sesi
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
              >
                ← Prev
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
              >
                Next →
              </button>
            </div>

            <Link
              href="/admin/sessions"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              Lihat Semua Sesi di Tab Jadwal ({meetings.length}) →
            </Link>
          </div>
        )}

      </div>

      {/* ── Right Column: Quick Activity & Status Command Panel (lg:col-span-4) ─ */}
      <div className="lg:col-span-4 flex flex-col gap-5">

        {/* Quick Activity Card */}
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Aktivitas Terkini
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Live Feed</span>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">Belum ada aktivitas tercatat.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentActivity.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-all hover:border-slate-200">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
                    {activityIcon(m)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {activityLabel(m)}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{formatDate(m.meeting_date)}</span>
                      <span>{formatTime(m.meeting_date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Command Center Quick Nav & Summary */}
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Ringkasan & Akses Cepat
          </h3>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-center">
              <p className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 tabular-nums">
                {upcomingCount}
              </p>
              <p className="text-[10px] font-semibold text-indigo-700/80 dark:text-indigo-400 mt-0.5">
                Mendatang
              </p>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
              <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">
                {doneCount}
              </p>
              <p className="text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                Sesi Selesai
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Links */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pintasan Admin
            </p>
            <Link
              href="/admin/sessions"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
              <span className="flex items-center gap-2">
                <span>🗓️</span> Kelola Semua Jadwal
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">→</span>
            </Link>

            <Link
              href="/admin/curriculum"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
              <span className="flex items-center gap-2">
                <span>📚</span> Kurikulum & Modul
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">→</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
            >
              <span className="flex items-center gap-2">
                <span>👥</span> Manajemen Pengguna
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">→</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}




