'use client';
// src/features/dashboard/student/StudentDashboardShell.tsx
// Renders the Town Square (default landing) directly — no tab toggle.
// "Riwayat" (session history) has moved to the Parent Hub page.

import Link from 'next/link';
import { TownSquarePod } from '@/features/dashboard/student/TownSquarePod';
import { CyberPetWidget } from '@/features/pet/components/CyberPetWidget';
import { CertificateBadge } from '@/features/certificates/components/CertificateBadge';
import { BillingNoticeModal } from '@/features/invoices/components/BillingNoticeModal';
import { AnnouncementBanner } from '@/features/announcements/components/AnnouncementBanner';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { isLive, formatDate, formatTime } from '@/lib/formatDate';
import type { TownSquareMeeting } from '@/features/sessions/queries';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import type { InvoiceRow } from '@/types/database';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: number | string;
  title: string;
  meeting_date: string;
  is_completed: boolean;
  session_count: number;
  session_number: number;
  progress_report?: string | null;
}

interface Props {
  studentId:          string;
  studentName:        string;
  gamData:            StudentGamificationData | null;
  certificates:       CertificateWithModule[];
  townSquareMeeting:  TownSquareMeeting | null;
  invoices:           InvoiceRow[];
  upcoming:           SessionItem[];
  past:               SessionItem[];
  /** Topics with NEEDS_QUIZ status — drives the mission banner */
  needsQuizTopics:    Array<{ id: number; title: string }>;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
      <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest
        whitespace-nowrap flex items-center gap-2">
        <i className={`${icon} text-purple-500`} />
        {label}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
    </div>
  );
}

// ── Needs-Quiz Mission Banner ─────────────────────────────────────────────────

function NeedsQuizBanner({
  topics,
}: {
  topics: Array<{ id: number; title: string }>;
}) {
  if (topics.length === 0) return null;
  const first = topics[0];

  return (
    <div className="rounded-2xl overflow-hidden ring-1
      ring-amber-400/60 dark:ring-amber-500/40
      bg-gradient-to-r from-amber-50 to-orange-50
      dark:from-amber-950/30 dark:to-orange-950/20
      shadow-md shadow-amber-200/40 dark:shadow-amber-900/30">
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        {/* Icon */}
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30
          flex items-center justify-center text-xl flex-shrink-0">
          🔥
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest
            text-amber-600 dark:text-amber-400 mb-0.5 flex items-center gap-1.5">
            <i className="fa-solid fa-bolt text-amber-500" /> Misi Baru
          </p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
            Kuis{' '}
            <span className="text-amber-700 dark:text-amber-300">
              {first.title}
            </span>{' '}
            Siap Dikerjakan!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Selesaikan untuk klaim EXP &amp; Koin.
            {topics.length > 1 && ` +${topics.length - 1} kuis lainnya menunggu.`}
          </p>
        </div>

        {/* CTA — navigate to Quest Map */}
        <Link
          href="/student/lessons"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5
            rounded-2xl text-xs font-extrabold text-white
            bg-gradient-to-r from-amber-500 to-orange-500
            shadow-md shadow-amber-400/30 hover:shadow-amber-400/50
            hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
        >
          <i className="fa-solid fa-play text-[10px]" />
          Mulai Kuis
        </Link>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function StudentDashboardShell({
  studentId,
  studentName,
  gamData,
  certificates,
  townSquareMeeting,
  invoices,
  upcoming,
  past,
  needsQuizTopics,
}: Props) {
  const next    = upcoming[0] ?? null;
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));
  const lvl     = gamData ? calculateLevel(gamData.totalXp) : null;

  // Cap "Jadwal Berikutnya" to max 4 (slot 0 = TownSquarePod, so show 1-4)
  const nextFour = upcoming.slice(1, 5);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Announcement ── */}
      <AnnouncementBanner role="students" />

      {/* ── NEEDS_QUIZ mission banner ── */}
      <NeedsQuizBanner topics={needsQuizTopics} />

      {/* ── Welcome hero ── */}
      <div
        className={`relative rounded-3xl overflow-hidden p-6 sm:p-7 text-white shadow-xl
          transition-all duration-300 cursor-pointer hover:scale-[1.01]
          ${hasLive
            ? 'bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 border border-rose-500/30 shadow-rose-950/40'
            : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 border border-purple-500/30 shadow-purple-950/40'
          }`}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {hasLive ? (
              <div className="inline-flex items-center gap-2 bg-rose-500/20 backdrop-blur-md text-rose-300
                text-xs font-black px-3.5 py-1 rounded-full mb-2 border border-rose-500/30">
                <i className="fa-solid fa-tower-broadcast text-rose-300 fa-beat-fade" />
                KELAS SEDANG BERLANGSUNG!
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-purple-500/15 backdrop-blur-md text-purple-300
                text-xs font-extrabold px-3 py-1 rounded-full mb-2 border border-purple-500/20">
                <i className="fa-solid fa-rocket text-cyan-400" />
                Focus Belajar Hari Ini
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Selamat datang, {studentName}! {hasLive ? '🔥' : '🚀'}
            </h1>
            {next && (
              <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-calendar-day text-purple-400" />
                {hasLive ? 'Sedang berlangsung:' : 'Kelas berikutmu:'}{' '}
                <strong className="text-white">{formatDate(next.meeting_date)}</strong>
                {' pukul '}
                <strong className="text-white">{formatTime(next.meeting_date)}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-500/15 backdrop-blur-md text-emerald-300
              rounded-full px-3 py-1.5 text-xs font-black border border-emerald-500/25">
              <i className="fa-solid fa-circle-check text-emerald-400" />
              {past.length} Selesai
            </div>
            <div className="flex items-center gap-2 bg-sky-500/15 backdrop-blur-md text-sky-300
              rounded-full px-3 py-1.5 text-xs font-black border border-sky-500/25">
              <i className="fa-solid fa-clock text-sky-400" />
              {upcoming.length} Mendatang
            </div>
          </div>
        </div>
      </div>

      {/* ── Side-by-side: Town Square Pod + Cyber Pet ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Column 1: Town Square Pod */}
        <div className="h-full">
          <TownSquarePod
            meeting={townSquareMeeting}
            gamData={gamData}
            currentStudentId={studentId}
          />
        </div>

        {/* Column 2: Cyber Pet */}
        <div className="h-full">
          {gamData ? (
            <div className="h-full rounded-3xl bg-white dark:bg-slate-900/90
              border border-slate-200/80 dark:border-purple-500/40 shadow-sm
              shadow-[0_0_30px_rgba(139,92,246,0.12)]
              transition-all duration-300 hover:scale-[1.02] cursor-pointer
              hover:border-purple-400/70 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]
              p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3
                border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-robot text-purple-400 text-sm" />
                  <span className="text-xs font-black text-purple-600 dark:text-purple-300 uppercase tracking-widest">
                    Cyber Pet Companion
                  </span>
                </div>
                {lvl && (
                  <span className="text-[10px] font-black text-purple-700 dark:text-purple-300
                    bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    Level {lvl.currentLevel}
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center py-2
                [&_.text-indigo-700]:!text-purple-600
                dark:[&_.text-indigo-700]:!text-purple-300
                [&_.text-slate-700]:!text-slate-700
                dark:[&_.text-slate-700]:!text-slate-200
                [&_.text-slate-500]:!text-slate-500
                dark:[&_.text-slate-500]:!text-slate-400
                [&_.text-slate-400]:!text-slate-400
                dark:[&_.text-slate-400]:!text-slate-500
                [&_.bg-slate-100]:!bg-slate-100
                dark:[&_.bg-slate-100]:!bg-slate-800
                [&_.ring-indigo-200]:!ring-purple-300
                dark:[&_.ring-indigo-200]:!ring-purple-500/40">
                <CyberPetWidget {...gamData} />
              </div>
            </div>
          ) : (
            <div className="h-full rounded-3xl bg-white dark:bg-slate-900/90
              border border-slate-200/80 dark:border-purple-500/40 shadow-sm p-6
              flex flex-col items-center justify-center text-center gap-3">
              <div className="text-5xl select-none">🐾</div>
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                Cyber Pet Belum Aktif
              </h3>
            </div>
          )}
        </div>
      </div>

      {/* ── Certificate badges ── */}
      {certificates.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon="fa-solid fa-award" label="Sertifikatku" />
          <div className="grid gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <CertificateBadge key={cert.id} cert={cert} variant="full" />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming sessions (2nd–5th, max 4) ── */}
      {nextFour.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon="fa-solid fa-calendar-days" label="Jadwal Berikutnya" />
          {/* Responsive grid: 1 col → 2 col → 4 col with matching card heights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextFour.map((m) => (
              <div
                key={m.id}
                className="h-full flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-2xl
                  border border-slate-200/80 dark:border-zinc-800 p-4 shadow-sm
                  transition-all duration-300 hover:scale-[1.02] cursor-pointer
                  hover:border-purple-500/50 dark:hover:border-purple-500/60
                  hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] animate-fade-in-up"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400
                      flex items-center justify-center text-sm font-bold">
                      <i className="fa-solid fa-calendar-day" />
                    </div>
                    {m.session_count > 1 && (
                      <span className="text-[10px] font-black text-purple-400
                        bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                        Sesi {m.session_number}/{m.session_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3">
                    {m.title}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl
                    bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-cyan-300 font-extrabold text-xs">
                    <i className="fa-solid fa-clock text-purple-500 dark:text-cyan-400 text-[11px]" />
                    <span>{formatDate(m.meeting_date)}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold pl-0.5">
                    Pukul {formatTime(m.meeting_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Billing notice modal (shown once per session for unpaid invoices) ── */}
      <BillingNoticeModal invoices={invoices.filter((inv) => inv.status === 'sent')} />
    </div>
  );
}
