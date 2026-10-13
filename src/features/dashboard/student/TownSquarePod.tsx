'use client';
// src/features/dashboard/student/TownSquarePod.tsx
// Clean Cyber EdTech Town Square Pod with interactive seats:
//   - Own seat → opens PetWardrobeModal (buy/equip accessories)
//   - Peer seat → opens PeerInspectModal (read-only profile card)
//   - Empty seat → cursor-default, no interaction

import { useState, useEffect } from 'react';
import type { TownSquareMeeting, TownSquareSeat } from '@/features/sessions/queries';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import { PetWardrobeModal } from '@/features/dashboard/student/modals/PetWardrobeModal';
import { PeerInspectModal } from '@/features/dashboard/student/modals/PeerInspectModal';

export type ScheduleState = 'STATE_A' | 'STATE_B' | 'STATE_C' | 'STATE_D';

interface Props {
  meeting:      TownSquareMeeting | null;
  nextMeeting?: TownSquareMeeting | null;
  forceState?:  ScheduleState;
  /** Gamification data for the current student — drives wardrobe modal */
  gamData?:     StudentGamificationData | null;
  /** Supabase auth id of the logged-in student (to identify self seat) */
  currentStudentId?: string | null;
}

// ── Time & State Calculation Helpers ─────────────────────────────────────────

const CLASS_DURATION_MINUTES = 60;
const BUFFER_AFTER_END_MINUTES = 60;

function computeScheduleState(
  meeting: TownSquareMeeting | null,
  nowMs: number
): { state: ScheduleState; secondsLeftToStart: number; secondsLeftToEnd: number } {
  if (!meeting) {
    return { state: 'STATE_A', secondsLeftToStart: 0, secondsLeftToEnd: 0 };
  }

  const startMs = new Date(meeting.meeting_date).getTime();
  const endMs = startMs + CLASS_DURATION_MINUTES * 60 * 1000;
  const stateE_Ms = endMs + BUFFER_AFTER_END_MINUTES * 60 * 1000;

  const secondsLeftToStart = Math.max(0, Math.floor((startMs - nowMs) / 1000));
  const secondsLeftToEnd   = Math.max(0, Math.floor((endMs - nowMs) / 1000));

  if (nowMs < startMs) {
    return { state: 'STATE_B', secondsLeftToStart, secondsLeftToEnd };
  }

  if (nowMs >= startMs && nowMs <= endMs) {
    return { state: 'STATE_C', secondsLeftToStart: 0, secondsLeftToEnd };
  }

  if (nowMs > endMs && nowMs <= stateE_Ms) {
    return { state: 'STATE_D', secondsLeftToStart: 0, secondsLeftToEnd: 0 };
  }

  return { state: 'STATE_A', secondsLeftToStart: 0, secondsLeftToEnd: 0 };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const hrs  = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Avatar circle ─────────────────────────────────────────────────────────────

const PET_EMOJI: Record<string, string> = {
  cat: '🐱', dog: '🐶', fox: '🦊', bunny: '🐰',
  bear: '🐻', owl: '🦉', dragon: '🐲', robot: '🤖',
};

function AvatarCircle({
  seat,
  size = 'md',
}: {
  seat: TownSquareSeat;
  size?: 'sm' | 'md' | 'lg';
}) {
  const emoji = seat.avatar_id ? (PET_EMOJI[seat.avatar_id] ?? '👨‍astro') : '👨‍astro';
  const dims  = size === 'lg' ? 'w-14 h-14 text-2xl' : size === 'md' ? 'w-11 h-11 text-xl' : 'w-8 h-8 text-base';
  const ring  = seat.is_self
    ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse cursor-pointer hover:scale-105 transition-all'
    : 'ring-1 ring-slate-200 dark:ring-zinc-800 group-hover:ring-purple-500/50 transition-all';

  return (
    <div className={`${dims} ${ring} rounded-2xl bg-gradient-to-br
      from-indigo-50 to-purple-100 dark:from-zinc-900 dark:to-indigo-950/80
      flex items-center justify-center select-none relative transition-transform hover:scale-105`}>
      {seat.avatar_id ? emoji : <i className="fa-solid fa-user-astronaut text-indigo-500 dark:text-cyan-400 text-lg" />}
      
      {/* Online indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
      
      {seat.is_self && (
        <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-cyan-500
          text-slate-950 font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm">
          YOU
        </span>
      )}
    </div>
  );
}

// ── Teacher seat ──────────────────────────────────────────────────────────────

function TeacherSeat({ name }: { name: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative group">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600
          flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20
          ring-2 ring-amber-300/40 dark:ring-amber-400/30 transition-transform group-hover:scale-105">
          👨‍🏫
        </div>
        {/* Crown Icon */}
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm select-none drop-shadow-md">
          <i className="fa-solid fa-crown text-amber-400" />
        </span>
      </div>
      <div className="text-center">
        <p className="text-xs font-black text-amber-700 dark:text-amber-300">
          {name ?? 'Guru'}
        </p>
        <span className="text-[9px] font-extrabold uppercase tracking-wider
          bg-amber-500/10 text-amber-600 dark:text-amber-300
          px-2 py-0.5 rounded-full border border-amber-500/25 inline-flex items-center gap-1">
          <i className="fa-solid fa-graduation-cap text-[9px]" /> Pengajar
        </span>
      </div>
    </div>
  );
}

// ── Student seat slot ─────────────────────────────────────────────────────────

function StudentSeat({
  seat,
  onClick,
}: {
  seat:    TownSquareSeat | null;
  onClick?: () => void;
}) {
  if (!seat) {
    return (
      <div className="flex flex-col items-center gap-1.5 opacity-60 cursor-default">
        <div className="w-11 h-11 rounded-2xl border-2 border-dashed border-slate-300
          dark:border-zinc-700/80 flex items-center justify-center text-slate-400
          dark:text-zinc-500 text-xs font-bold bg-slate-50/50 dark:bg-zinc-950/40">
          <i className="fa-solid fa-plus" />
        </div>
        <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold">
          Kosong
        </p>
      </div>
    );
  }

  const firstName = seat.full_name.split(' ')[0];
  return (
    <button
      type="button"
      onClick={onClick}
      title={seat.is_self ? 'Buka Lemari Kostummu' : `Lihat Pet ${firstName}`}
      className={`flex flex-col items-center gap-1.5 group relative
        focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-2xl p-0.5
        ${seat.is_self ? 'cursor-pointer hover:scale-105 transition-transform' : onClick ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
    >
      <div className="relative">
        <AvatarCircle seat={seat} size="md" />
        {!seat.is_self && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black
            bg-purple-600/90 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10 pointer-events-none">
            Lihat Pet
          </span>
        )}
      </div>
      <p className={`text-[10px] font-black truncate max-w-[60px] text-center
        group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors
        ${seat.is_self
          ? 'text-cyan-600 dark:text-cyan-300'
          : 'text-slate-700 dark:text-slate-300'
        }`}>
        {firstName}
      </p>
    </button>
  );
}

// ── STATE A: Compact Empty State Layout (Max 120px tall) ─────────────────────

function StateA_EmptyState() {
  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/80
      border border-blue-500/40 dark:border-purple-500/40 shadow-sm p-5
      flex items-center justify-between gap-4 transition-all duration-300 hover:scale-[1.01] cursor-pointer">

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20
          flex items-center justify-center text-2xl flex-shrink-0">
          🚀
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mb-0.5">
            <i className="fa-solid fa-landmark" /> Town Square Pod
          </span>
          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
            Tidak ada kelas live hari ini — Lanjutkan petualanganmu! 🎮
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Gurumu akan menjadwalkan kelas berikutnya. Nikmati quest belajarmu!
          </p>
        </div>
      </div>

      <button
        disabled
        className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
          bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500
          border border-slate-200 dark:border-zinc-700/60 cursor-not-allowed opacity-75 flex-shrink-0"
      >
        <i className="fa-solid fa-calendar-xmark" />
        <span>Tidak Ada Jadwal</span>
      </button>
    </div>
  );
}

// ── Main Town Square Pod Export ──────────────────────────────────────────────

export function TownSquarePod({ meeting, nextMeeting, forceState, gamData, currentStudentId }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  // Modal state — client-only (no SSR)
  const [wardrobeOpen, setWardrobeOpen]     = useState(false);
  const [peerSeat,     setPeerSeat]         = useState<TownSquareSeat | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Before mount, always show STATE_A or the locked "upcoming" skeleton so
  // the server HTML and the first client render are identical.
  // The real state is computed only after the client has the real clock.
  const currentNow = isMounted ? nowMs : 0;

  const computed = computeScheduleState(
    isMounted ? meeting : null,  // treat as no meeting until mounted
    currentNow
  );

  let activeMeeting = meeting;
  let activeState = forceState ?? computed.state;
  let secondsLeftToStart = computed.secondsLeftToStart;

  if (isMounted && !forceState && computed.state === 'STATE_A' && meeting && nextMeeting) {
    const nextComputed = computeScheduleState(nextMeeting, currentNow);
    if (nextComputed.state !== 'STATE_A') {
      activeMeeting = nextMeeting;
      activeState = nextComputed.state;
      secondsLeftToStart = nextComputed.secondsLeftToStart;
    }
  }

  // When not mounted: keep activeMeeting for seat layout but force STATE_A
  // so the entry-gate renders the same disabled skeleton on server + client.
  if (!isMounted && meeting) {
    activeMeeting = meeting;
    activeState = 'STATE_A';
  }

  const displayCountdown = isMounted ? formatCountdown(secondsLeftToStart) : '--:--:--';

  // STATE A with no meeting at all → compact empty state
  if (activeState === 'STATE_A' && !activeMeeting) {
    return <StateA_EmptyState />;
  }

  // STATE A with a meeting → show pod shell but with neutral "upcoming" footer
  // (this is also what renders on the server before hydration)
  if (activeState === 'STATE_A' || !activeMeeting) {
    if (!activeMeeting) return <StateA_EmptyState />;
  }

  const slots: (TownSquareSeat | null)[] = [
    ...activeMeeting.seats.slice(0, 4),
    ...Array<null>(Math.max(0, 4 - activeMeeting.seats.length)).fill(null),
  ];

  const sessionLabel =
    activeMeeting.session_count > 1
      ? `Sesi ${activeMeeting.session_number}/${activeMeeting.session_count} · `
      : '';

  const hasLink = Boolean(activeMeeting.link_url);

  return (
    <>
    <div className="h-full rounded-3xl bg-white dark:bg-zinc-900/80
      border border-blue-500/40 dark:border-purple-500/40 shadow-sm
      shadow-[0_0_30px_rgba(139,92,246,0.12)]
      transition-all duration-300 hover:scale-[1.02] cursor-pointer
      hover:border-purple-400/70 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]
      flex flex-col justify-between overflow-hidden">

      {/* ── Pod Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900
        border-b border-slate-800 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-0.5 flex items-center gap-1.5">
              <i className="fa-solid fa-landmark text-cyan-400" /> Town Square Pod
            </p>
            <h3 className="font-extrabold text-sm leading-tight truncate">
              {sessionLabel}{activeMeeting.title}
            </h3>
          </div>

          <div className="flex-shrink-0">
            {isMounted && activeState === 'STATE_C' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black
                text-white bg-rose-600 px-2.5 py-1 rounded-full shadow-md shadow-rose-500/30">
                <i className="fa-solid fa-video fa-beat-fade text-white" /> LIVE NOW
              </span>
            )}
            {isMounted && activeState === 'STATE_B' && (
              <span
                suppressHydrationWarning
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold
                  text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/30"
              >
                <i className="fa-solid fa-clock text-purple-400" /> {displayCountdown}
              </span>
            )}
            {isMounted && activeState === 'STATE_D' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold
                text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <i className="fa-solid fa-circle-check text-emerald-400" /> SELESAI
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Virtual Table & Seats ── */}
      <div className="px-5 pt-4 pb-2 flex-1 flex flex-col justify-center">

        {/* Teacher row */}
        <div className="flex justify-center mb-3">
          <TeacherSeat name={activeMeeting.teacher_name} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-slate-100 dark:bg-white/10" />
          <span className="text-[9px] font-black uppercase tracking-widest
            text-slate-400 dark:text-slate-500 whitespace-nowrap px-1 flex items-center gap-1">
            <i className="fa-solid fa-user-group text-purple-400 text-[10px]" /> Meja Belajar
          </span>
          <div className="flex-1 h-px bg-slate-100 dark:bg-white/10" />
        </div>

        {/* 4 Student Seats */}
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          {slots.map((seat, i) => {
            // Determine click handler per seat type
            let handleClick: (() => void) | undefined;
            if (seat) {
              if (seat.is_self) {
                handleClick = isMounted ? () => setWardrobeOpen(true) : undefined;
              } else {
                handleClick = isMounted ? () => setPeerSeat(seat) : undefined;
              }
            }
            // empty seat → no handler (cursor-default)
            return (
              <StudentSeat
                key={seat?.student_id ?? `empty-${i}`}
                seat={seat}
                onClick={handleClick}
              />
            );
          })}
        </div>
      </div>

      {/* ── Entry Gate & Dynamic State Footer ── */}
      <div className="px-5 pb-5">
        {!hasLink ? (
          <div className="mt-2 rounded-2xl bg-amber-500/10
            border border-amber-500/20 px-3.5 py-3 text-center">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-500" /> Link kelas belum tersedia
            </p>
          </div>
        ) : activeState === 'STATE_A' ? (
          /* STATE A (mounted, has meeting) → neutral locked skeleton */
          <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/50
            border border-slate-200/80 dark:border-purple-500/20 p-3.5 text-center">
            <button disabled
              className="w-full py-3 rounded-2xl text-xs font-black
                bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500
                border border-slate-300/50 dark:border-zinc-700/60
                cursor-not-allowed opacity-75 flex items-center justify-center gap-2">
              <i className="fa-solid fa-lock text-slate-400 dark:text-zinc-500" />
              <span>Tidak Ada Kelas Hari Ini</span>
            </button>
          </div>
        ) : activeState === 'STATE_B' && isMounted ? (
          /* STATE B: Upcoming Class Countdown */
          <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/50
            border border-slate-200/80 dark:border-purple-500/20 p-3.5 text-center">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-clock text-purple-400" /> Hitung Mundur Kelas
              </span>
              <span
                suppressHydrationWarning
                className="font-mono font-black text-xs text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20"
              >
                {displayCountdown}
              </span>
            </div>

            <button
              disabled
              className="w-full mt-1 py-3 rounded-2xl text-xs font-black
                bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500
                border border-slate-300/50 dark:border-zinc-700/60
                cursor-not-allowed opacity-75 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-lock text-slate-400 dark:text-zinc-500" />
              <span>Pintu Belum Terbuka</span>
            </button>
          </div>
        ) : activeState === 'STATE_C' && isMounted ? (
          /* STATE C: Live Class Active */
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10
            border border-emerald-500/40 p-3.5 text-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <i className="fa-solid fa-video fa-beat-fade text-emerald-500" /> Pintu Terbuka!
              </span>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300 uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live Now
              </span>
            </div>

            <a
              href={activeMeeting.link_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-1 inline-flex items-center justify-center gap-2.5 py-3 rounded-2xl
                text-xs font-black text-white shadow-xl transition-all duration-300
                bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600
                shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <i className="fa-solid fa-video fa-beat-fade text-sm text-white" />
              <span>Masuk Kelas Zoom</span>
            </a>
          </div>
        ) : activeState === 'STATE_D' && isMounted ? (
          /* STATE D: Class Ended */
          <div className="mt-2 rounded-2xl bg-emerald-500/10
            border border-emerald-500/20 p-3.5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold
              text-emerald-600 dark:text-emerald-300 mb-2">
              <i className="fa-solid fa-circle-check text-emerald-500" />
              <span>Kelas Hari Ini Selesai</span>
            </div>
            <button
              disabled
              className="w-full mt-1 py-3 rounded-2xl text-xs font-black
                bg-emerald-500/15 text-emerald-600 dark:text-emerald-400
                border border-emerald-500/30 cursor-default opacity-85
                flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check text-emerald-500" />
              <span>Kelas Selesai</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>

    {/* ── Modals — rendered only after mount to avoid hydration mismatch ── */}
    {isMounted && wardrobeOpen && gamData && (
      <PetWardrobeModal
        studentName={gamData.fullName}
        coins={gamData.coins}
        inventory={gamData.inventory ?? []}
        equippedHatId={gamData.equippedHatId ?? null}
        onClose={() => setWardrobeOpen(false)}
      />
    )}
    {isMounted && peerSeat && (
      <PeerInspectModal
        seat={peerSeat}
        onClose={() => setPeerSeat(null)}
      />
    )}
    </>
  );
}
