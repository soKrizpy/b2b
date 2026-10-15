'use client';
// src/app/student/lessons/QuestProgressBar.tsx
// Ultra-satisfying animated progress bar for the Quest Map expedition.
// Features spring physics (motion/react), animated number counter, radiant shimmer beams,
// dynamic spark tip, interactive topic milestone waypoints, and celebratory confetti bursts.

import { useEffect, useState, useRef } from 'react';
import { motion, animate } from 'motion/react';
import { Sparkles, Trophy, Flame, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface QuestProgressBarProps {
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  topics?: Array<{ id?: number; title: string; status: string }>;
  variant?: 'banner' | 'map-hud';
  className?: string;
}

export function QuestProgressBar({
  completedCount,
  totalCount,
  isComplete,
  topics = [],
  variant = 'banner',
  className = '',
}: QuestProgressBarProps) {
  const targetPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const [displayPct, setDisplayPct] = useState(0);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const currentPctRef = useRef(0);
  const prevCountRef = useRef(completedCount);

  // Smooth numeric counter animation
  useEffect(() => {
    const controls = animate(currentPctRef.current, targetPct, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
      onUpdate: (latest) => {
        currentPctRef.current = latest;
        setDisplayPct(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [targetPct]);

  // Satisfying celebration burst when completing topics or finishing module
  useEffect(() => {
    if (completedCount > prevCountRef.current && !hasCelebrated) {
      setHasCelebrated(true);
      confetti({
        particleCount: isComplete ? 70 : 35,
        spread: isComplete ? 80 : 55,
        origin: { y: 0.65 },
        colors: isComplete
          ? ['#F59E0B', '#10B981', '#06B6D4', '#8B5CF6']
          : ['#06B6D4', '#10B981', '#38BDF8', '#6366F1'],
        disableForReducedMotion: true,
      });
    }
    prevCountRef.current = completedCount;
  }, [completedCount, isComplete, hasCelebrated]);

  const isMapHud = variant === 'map-hud';

  return (
    <div className={`relative flex flex-col gap-2.5 w-full select-none ${className}`}>
      {/* ── Top Metric Header ── */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
            <CompassMiniIcon className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>Ekspedisi:</span>
            <span className="text-white font-extrabold">{completedCount}/{totalCount} Topik</span>
          </div>

          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-[10px] uppercase tracking-wider animate-bounce">
              <Trophy className="w-3 h-3 text-amber-400" /> Modul Ditaklukkan!
            </span>
          ) : completedCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-extrabold text-[10px] uppercase tracking-wide">
              <Flame className="w-3 h-3 text-amber-400" /> Misi Berlanjut
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 font-semibold text-[10px]">
              <Sparkles className="w-3 h-3 text-blue-400" /> Siap Menjelajah
            </span>
          )}
        </div>

        {/* Dynamic Percentage Badge with Pulse Glow */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Progres</span>
          <motion.div
            key={displayPct}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`font-black font-mono tabular-nums px-2.5 py-0.5 rounded-lg border ${
              isComplete
                ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'bg-slate-900/80 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            } text-sm sm:text-base`}
          >
            {displayPct}%
          </motion.div>
        </div>
      </div>

      {/* ── Main Satisfying Animated Progress Track ── */}
      <div
        className={`relative w-full overflow-visible rounded-full p-[3px] bg-slate-950/80 border border-white/15 backdrop-blur-md shadow-inner shadow-black/60 ${
          isMapHud ? 'h-5' : 'h-6'
        }`}
      >
        {/* Subtle background rail line */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[2px] bg-white/5 rounded-full pointer-events-none" />

        {/* Animated Fill Bar Container */}
        <div className="relative h-full w-full rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, targetPct))}%` }}
            transition={{
              type: 'spring',
              stiffness: 70,
              damping: 18,
              mass: 0.9,
              restDelta: 0.001,
            }}
            className={`relative h-full rounded-full ${
              isComplete
                ? 'bg-gradient-to-r from-teal-500 via-emerald-400 to-green-300 shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300 shadow-[0_0_18px_rgba(6,182,212,0.6)]'
            }`}
          >
            {/* 1. Continuous Radiant Shimmer Light Beam */}
            <div
              className="absolute inset-0 pointer-events-none animate-progress-shimmer opacity-70"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.15) 70%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />

            {/* 2. Top-edge glass reflection sheen */}
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

            {/* 3. Subtle micro-stripe animated texture */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 16px)',
              }}
            />
          </motion.div>
        </div>

        {/* ── 4. Glowing Leading Spark Indicator (Head Tip) ── */}
        {targetPct > 0 && targetPct <= 100 && (
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${Math.max(1, Math.min(99, targetPct))}%` }}
            transition={{
              type: 'spring',
              stiffness: 70,
              damping: 18,
              mass: 0.9,
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center"
          >
            {/* Halo pulse aura */}
            <div className="absolute w-8 h-8 rounded-full bg-cyan-400/30 blur-md animate-ping" />

            {/* Radiant core spark */}
            <div
              className={`w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                isComplete
                  ? 'bg-amber-400 text-slate-950 shadow-amber-400/80 animate-bounce'
                  : 'bg-cyan-300 text-slate-950 shadow-cyan-400/90 animate-sparkle-tip'
              }`}
            >
              {isComplete ? (
                <Trophy className="w-2.5 h-2.5" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
          </motion.div>
        )}

        {/* ── 5. Milestone Waypoints along the Track ── */}
        {totalCount > 1 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-3 z-10">
            {Array.from({ length: totalCount }).map((_, idx) => {
              const nodeNum = idx + 1;
              const isPast = nodeNum <= completedCount;
              const isCurrent = nodeNum === completedCount + 1;
              const topicMeta = topics[idx];

              return (
                <div
                  key={idx}
                  className="relative pointer-events-auto"
                  onMouseEnter={() => setActiveTooltip(idx)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  {/* Waypoint Pip */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                      isPast
                        ? 'bg-emerald-400 border-white shadow-[0_0_8px_#34d399] scale-110'
                        : isCurrent
                        ? 'bg-cyan-400 border-white shadow-[0_0_12px_#38bdf8] scale-125 ring-2 ring-cyan-400/60 animate-pulse'
                        : 'bg-slate-800/80 border-white/20'
                    }`}
                  />

                  {/* Interactive Tooltip on hover */}
                  {activeTooltip === idx && topicMeta && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl bg-slate-900/95 border border-cyan-500/40 p-2 text-white shadow-xl shadow-black/70 backdrop-blur-md z-30 pointer-events-none"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider font-mono text-cyan-400">
                          Lokasi #{nodeNum}
                        </span>
                        {isPast ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            Tuntas ✓
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                            Misi Aktif 🔥
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            Terkunci 🔒
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight">
                        {topicMeta.title}
                      </p>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Subtitle Footnote: Motivation & Milestones ── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
        <span>
          {isComplete ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Seluruh tantangan pulau telah dikuasai!
            </span>
          ) : completedCount === 0 ? (
            <span>Mulai petualangan di lokasi pertama untuk mengisi progres ekspedisi.</span>
          ) : (
            <span>
              Tersisa <strong className="text-cyan-300">{totalCount - completedCount} lokasi</strong> menuju Ujian Mahakarya Akhir.
            </span>
          )}
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          Target Kelulusan: 100%
        </span>
      </div>
    </div>
  );
}

function CompassMiniIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}
