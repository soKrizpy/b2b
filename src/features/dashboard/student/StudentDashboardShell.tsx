'use client';
// src/features/dashboard/student/StudentDashboardShell.tsx
// RPG Fantasy Adventure Gamified LMS 3-Column Command Center for Students.
// Col 1 (25%): Adventurer Profile & Daily Bounties
// Col 2 (50%): Hero Realm Banner, Town Square Pod & Active Expedition Waypoint Map
// Col 3 (25%): Cyber Pet Companion & Rune Badges Showcase

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TownSquarePod } from '@/features/dashboard/student/TownSquarePod';
import { CyberPetWidget } from '@/features/pet/components/CyberPetWidget';
import { BillingNoticeModal } from '@/features/invoices/components/BillingNoticeModal';
import { AnnouncementBanner } from '@/features/announcements/components/AnnouncementBanner';
import { LevelUpCelebrationModal, getAdventurerTitle } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { getFantasyLocationForTopic } from '@/features/quiz/fantasyIsland';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { isLive, formatDate, formatTime } from '@/lib/formatDate';
import type { TownSquareMeeting } from '@/features/sessions/queries';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import type { InvoiceRow } from '@/types/database';
import type { TopicProgressSummary, ModuleWithTopics } from '@/features/curriculum/queries';
import type { QuestTopicNode } from '@/features/quiz/questMapQueries';
import {
  Sparkles,
  Compass,
  CheckCircle2,
  Flame,
  Calendar,
  Clock,
  ChevronRight,
  Award,
  CircleDot,
  Radio,
  BookOpen,
} from 'lucide-react';

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
  completedTopics?:   TopicProgressSummary[];
  allModules?:        ModuleWithTopics[];
  questNodes?:        QuestTopicNode[];
  activeModuleName?:  string;
}

// ── Section Header Component ──────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
      <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest
        whitespace-nowrap flex items-center gap-2">
        <span className="text-purple-500">{icon}</span>
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
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30
          flex items-center justify-center text-xl flex-shrink-0">
          🔥
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest
            text-amber-600 dark:text-amber-400 mb-0.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Misi Baru Terbuka
          </p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
            Ujian Rune <span className="text-amber-700 dark:text-amber-300">{first.title}</span> Siap Dikerjakan!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tuntaskan untuk mengklaim EXP &amp; Koin Petualangan.
            {topics.length > 1 && ` +${topics.length - 1} kuis lainnya menunggu.`}
          </p>
        </div>

        <Link
          href="/student/lessons"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5
            rounded-2xl text-xs font-extrabold text-white
            bg-gradient-to-r from-amber-500 to-orange-500
            shadow-md shadow-amber-400/30 hover:shadow-amber-400/50
            hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
        >
          <span>Mulai Kuis</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Active Expedition Waypoints Card ──────────────────────────────────────────

function ActiveExpeditionCard({
  nodes,
  moduleName,
}: {
  nodes: QuestTopicNode[];
  moduleName: string;
}) {
  if (nodes.length === 0) return null;

  // Find the index of the first active or needs_quiz node
  const activeIdx = nodes.findIndex(
    (n) => n.status === 'NEEDS_QUIZ' || n.status === 'ACTIVE_NEXT'
  );
  const startIdx = Math.max(0, activeIdx === -1 ? nodes.length - 3 : activeIdx - 1);
  const displayNodes = nodes.slice(startIdx, startIdx + 3);

  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-xl
      shadow-cyan-950/30 p-5 sm:p-6 text-white relative overflow-hidden">
      {/* Subtle topographic background accent */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                Kepulauan Kode · Jalur Ekspedisi
              </p>
              <h3 className="text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {moduleName || 'Petualangan Modul Aktif'}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-cyan-300 font-mono">
              {completedCount}/{nodes.length} Waypoint
            </span>
            <div className="w-24 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Waypoint Nodes List */}
        <div className="space-y-2.5 mb-4">
          {displayNodes.map((item) => {
            const isTarget = item.status === 'NEEDS_QUIZ' || item.status === 'ACTIVE_NEXT';

            return (
              <div
                key={item.topic.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition-all
                  ${isTarget
                    ? 'bg-cyan-950/40 border border-cyan-400/40 shadow-sm'
                    : item.status === 'COMPLETED'
                    ? 'bg-slate-800/40 border border-emerald-500/30'
                    : 'bg-slate-800/20 border border-slate-800 opacity-60'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs
                      ${item.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : item.status === 'NEEDS_QUIZ'
                        ? 'bg-amber-500/20 border border-amber-400 text-amber-300 animate-pulse'
                        : item.status === 'ACTIVE_NEXT'
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border border-slate-700 text-slate-500'
                      }`}
                  >
                    {item.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {item.status === 'NEEDS_QUIZ' && <Flame className="w-4 h-4 text-amber-400" />}
                    {item.status === 'ACTIVE_NEXT' && <CircleDot className="w-4 h-4 text-cyan-400" />}
                    {item.status === 'LOCKED' && <span className="text-[11px]">🔒</span>}
                  </div>

                  <div className="min-w-0">
                    {(() => {
                      const loc = getFantasyLocationForTopic(item.topic.title, nodes.indexOf(item));
                      return (
                        <>
                          <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{loc.emoji}</span>
                            <span>{item.topic.title}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {loc.biomeName} · {item.status === 'COMPLETED' ? 'Lokasi Ditaklukkan' : item.status === 'NEEDS_QUIZ' ? 'Ujian Rune Terbuka!' : item.status === 'ACTIVE_NEXT' ? 'Siap Dijelajahi' : 'Terkunci'}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Stars or Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === 'COMPLETED' && (
                    <div className="flex gap-0.5 text-amber-400 text-xs">
                      <span>★</span><span>★</span><span>★</span>
                    </div>
                  )}

                  {isTarget && (
                    <Link
                      href="/student/lessons"
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black text-slate-950
                        bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1"
                    >
                      <span>Mulai</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation CTA */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 text-[11px]">
            Buka seluruh kabut kepulauan kode untuk meraih lencana master.
          </span>
          <Link
            href="/student/lessons"
            className="text-cyan-400 hover:text-cyan-300 font-extrabold flex items-center gap-1 transition-colors"
          >
            <span>Peta Quest Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Shell Component ──────────────────────────────────────────────────────

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
  completedTopics = [],
  allModules = [],
  questNodes = [],
  activeModuleName = '',
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = upcoming[0] ?? null;
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));
  const lvl = gamData ? calculateLevel(gamData.totalXp) : null;
  const adventurerInfo = lvl ? getAdventurerTitle(lvl.currentLevel) : getAdventurerTitle(1);

  // Next 4 schedule items (excluding town square primary slot)
  const nextFour = upcoming.slice(1, 5);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Announcement Banner ── */}
      <AnnouncementBanner role="students" />

      {/* ── NEEDS_QUIZ Mission Banner ── */}
      <NeedsQuizBanner topics={needsQuizTopics} />

      {/* ══════════════════════════════════════════════════════════════════════════
          3-COLUMN COMMAND CENTER LAYOUT (Desktop 1440px / Tablet / Mobile)
          Col 1 (3/12): Adventurer Profile & Bounties
          Col 2 (6/12): Hero Stage, Live Town Square & Waypoints
          Col 3 (3/12): Cyber Pet Companion & Showcase Badges
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ─── COLUMN 1 (LEFT, 3 cols): Adventurer Hub & Bounties ───────────── */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">

          {/* Adventurer Profile Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
            p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
                flex items-center justify-center text-2xl shadow-md shadow-amber-500/20 text-white select-none">
                {adventurerInfo.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
                  Tingkat {lvl?.currentLevel ?? 1}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {studentName}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {adventurerInfo.title}
                </p>
              </div>
            </div>

            {/* EXP Bar */}
            {lvl && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Progres EXP</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">
                    {lvl.xpInCurrentLevel} / {lvl.xpNeededThisLevel} XP
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${lvl.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Level {lvl.currentLevel}</span>
                  <span>Level {lvl.currentLevel + 1}</span>
                </div>
              </div>
            )}

            {/* Coins & Inventory Quick Stats */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Koin RPG</p>
                <p className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">
                  {gamData?.coins ?? 0} 🪙
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Total EXP</p>
                <p className="text-sm font-black text-purple-700 dark:text-purple-300 font-mono">
                  {gamData?.totalXp ?? 0} ✨
                </p>
              </div>
            </div>

            {/* Level-Up Celebration Trigger */}
            <button
              type="button"
              onClick={() => setIsCelebrationOpen(true)}
              className="w-full py-2.5 px-3 rounded-2xl text-xs font-black text-slate-900 dark:text-white
                bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-yellow-400/20
                hover:from-amber-400/30 hover:to-yellow-400/30
                border border-amber-400/40 transition-all flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
              <span>Rayakan Status Level</span>
            </button>
          </div>

          {/* Daily Bounties / Misi Harian Petualang */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
            p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-500" />
                Misi Harian
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Pembaruan 24 Jam
              </span>
            </div>

            <div className="space-y-2">
              {/* Mission 1 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    Presensi &amp; Masuk Kelas
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {upcoming.length > 0 ? '1 Sesi dijadwalkan' : 'Belum ada sesi hari ini'}
                  </p>
                </div>
              </div>

              {/* Mission 2 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                  ${needsQuizTopics.length > 0
                    ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {needsQuizTopics.length > 0 ? <Flame className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    Tuntaskan Ujian Rune
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {needsQuizTopics.length > 0
                      ? `${needsQuizTopics.length} kuis menanti dikerjakan`
                      : 'Semua kuis tuntas!'}
                  </p>
                </div>
              </div>

              {/* Mission 3 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    Cek Kondisi Companion Pet
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Beri energi dan rawat mood pet
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/student/lessons"
              className="text-center block text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
            >
              Jelajahi Peta Quest Lengkap →
            </Link>
          </div>

        </div>

        {/* ─── COLUMN 2 (CENTER, 6 cols): Hero Stage, Live Pod & Waypoints ──── */}
        <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">

          {/* Hero Realm Welcome Card */}
          <div
            className={`relative rounded-3xl overflow-hidden p-6 sm:p-7 text-white shadow-xl
              transition-all duration-300
              ${hasLive
                ? 'bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 border border-rose-500/30 shadow-rose-950/40'
                : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 border border-purple-500/30 shadow-purple-950/40'
              }`}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/15 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {hasLive ? (
                  <div className="inline-flex items-center gap-2 bg-rose-500/20 backdrop-blur-md text-rose-300
                    text-xs font-black px-3.5 py-1 rounded-full mb-2 border border-rose-500/30">
                    <Radio className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                    KELAS SEDANG BERLANGSUNG!
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-purple-500/15 backdrop-blur-md text-purple-300
                    text-xs font-extrabold px-3 py-1 rounded-full mb-2 border border-purple-500/20">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Realm Belajar Coding Hari Ini
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Selamat berpetualang, {studentName}! {hasLive ? '🔥' : '🚀'}
                </h1>
                {next && (
                  <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {hasLive ? 'Sedang berlangsung:' : 'Jadwal kelas:'}{' '}
                    <strong className="text-white" suppressHydrationWarning>
                      {mounted ? formatDate(next.meeting_date) : 'Memuat jadwal...'}
                    </strong>
                    {' pukul '}
                    <strong className="text-white" suppressHydrationWarning>
                      {mounted ? formatTime(next.meeting_date) : '--:--'}
                    </strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-emerald-500/15 backdrop-blur-md text-emerald-300
                  rounded-2xl px-3 py-1.5 text-xs font-black border border-emerald-500/25">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {past.length} Tuntas
                </div>
                <div className="flex items-center gap-1.5 bg-sky-500/15 backdrop-blur-md text-sky-300
                  rounded-2xl px-3 py-1.5 text-xs font-black border border-sky-500/25">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  {upcoming.length} Menanti
                </div>
              </div>
            </div>
          </div>

          {/* Town Square Pod (Interactive Virtual Classroom) */}
          <div className="w-full">
            <TownSquarePod
              meeting={townSquareMeeting}
              gamData={gamData}
              currentStudentId={studentId}
            />
          </div>

          {/* Active Expedition Waypoints Card */}
          {questNodes.length > 0 && (
            <ActiveExpeditionCard
              nodes={questNodes}
              moduleName={activeModuleName}
            />
          )}

        </div>

        {/* ─── COLUMN 3 (RIGHT, 3 cols): Companion Pet & Skill Progression ─── */}
        <div className="lg:col-span-3 space-y-6 order-3">

          {/* Cyber Pet Companion Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-purple-500/40
            shadow-sm shadow-purple-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black text-purple-600 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Companion Pet
              </span>
              {lvl && (
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300
                  bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-mono">
                  Lvl {lvl.currentLevel}
                </span>
              )}
            </div>

            {gamData ? (
              <div className="py-1">
                <CyberPetWidget {...gamData} />
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="text-4xl select-none">🐾</div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Cyber Pet belum diaktifkan
                </p>
              </div>
            )}
          </div>

          {/* Mini Skill Progression Glance */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
            p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                Ringkasan Belajar
              </span>
              <span className="text-[11px] font-mono text-cyan-500 font-bold">
                {completedTopics.length} Topik
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Modul Terbuka</span>
                <span className="font-bold">{allModules.length} Modul</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Sertifikat Diraih</span>
                <span className="font-bold text-amber-500">{certificates.length} Lencana</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Status Kuis</span>
                <span className={`font-bold ${needsQuizTopics.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {needsQuizTopics.length > 0 ? `${needsQuizTopics.length} Perlu Dikerjakan` : 'Tuntas Semua'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/student/achievements"
                className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center justify-between"
              >
                <span>Lihat Detail Target Modul</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Certificates / Badge Highlight */}
          {certificates.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
              p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Koleksi Utama
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {certificates.length} Diperoleh
                </span>
              </div>

              <div className="space-y-2">
                {certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-500/30 flex items-center gap-2.5"
                  >
                    <span className="text-lg">🏆</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cert.module_title || 'Sertifikat Kelulusan'}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                        Tier {cert.tier} · Nilai {cert.score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/student/achievements"
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-between"
                >
                  <span>Buka Semua Lencana</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          LOWER SECTIONS (Full Width): Full Badges, Progress Chart, Sesi
          ══════════════════════════════════════════════════════════════════════════ */}

      {/* ── Quick Teleport Banner: Lencana & Target Modul Tab ── */}
      <section className="rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 p-5 sm:p-6 shadow-xl shadow-purple-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl flex-shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono">
                  Tab Baru Siswa
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  TERPISAH &amp; RAPI
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Lencana Pencapaian, Progres Belajar &amp; Target Modul
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Seluruh galeri lencana prestasi, sertifikat kelulusan modul, grafik progres belajar, dan target mingguan kini telah dipisahkan ke tab khusus antara Quest Map dan Parent Hub.
              </p>
            </div>
          </div>

          <Link
            href="/student/achievements"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl
              text-xs font-black text-white self-start sm:self-center
              bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700
              hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30
              hover:scale-[1.02] active:scale-95 transition-all flex-shrink-0 font-mono"
          >
            <span>Buka Lencana &amp; Target</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Upcoming Sessions (2nd–5th) ── */}
      {nextFour.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={<Calendar className="w-4 h-4" />} label="Jadwal Berikutnya" />
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
                      <Calendar className="w-4 h-4" />
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
                    <Clock className="w-3 h-3 text-purple-500 dark:text-cyan-400" />
                    <span suppressHydrationWarning>{mounted ? formatDate(m.meeting_date) : '...'}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold pl-0.5" suppressHydrationWarning>
                    Pukul {mounted ? formatTime(m.meeting_date) : '--:--'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Billing Notice Modal ── */}
      <BillingNoticeModal invoices={invoices.filter((inv) => inv.status === 'sent')} />

      {/* ── Level-Up Celebration Modal ── */}
      <LevelUpCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        level={lvl?.currentLevel ?? 1}
        totalXp={gamData?.totalXp ?? 0}
        coins={gamData?.coins ?? 0}
        studentName={studentName}
      />
    </div>
  );
}
