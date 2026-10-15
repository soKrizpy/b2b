'use client';
// src/features/quiz/components/QuestAnimatedProgressBar.tsx
// RPG-style satisfying animated progress bar for Quest Map expeditions.
// Features:
//   - Smooth spring width animation via motion/react
//   - Shimmer light beam sweep & pulsating neon tip flare
//   - Milestone checkpoints (25%, 50%, 75%, 100%) with status badges
//   - Web Audio API pleasant celebratory chime on milestone/completion
//   - Canvas confetti burst when reaching 100% mastery

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring } from 'motion/react';
import confetti from 'canvas-confetti';
import { Star, Sparkles, Flag, Crown, CheckCircle2 } from 'lucide-react';

interface QuestAnimatedProgressBarProps {
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  moduleTitle?: string | null;
}

// Synthesize a crisp, uplifting 8-bit/RPG completion chime using Web Audio API
function playChime(isMastery = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = isMastery
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5 - E5 - G5 - C6 - E6
      : [523.25, 659.25, 783.99, 1046.5];        // C5 - E5 - G5 - C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  } catch {
    // Ignore audio permission or un-interacted policy
  }
}

export function QuestAnimatedProgressBar({
  completedCount,
  totalCount,
  isComplete,
}: QuestAnimatedProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  const targetPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Spring animation for smooth satisfying fill
  const springValue = useSpring(0, {
    stiffness: 90,
    damping: 18,
    mass: 0.6,
  });

  const [displayPct, setDisplayPct] = useState(0);
  const prevPctRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    // Animate from previous percent to target percent
    springValue.set(targetPct);
  }, [targetPct, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayPct(Math.round(latest));
    });
    return () => unsubscribe();
  }, [springValue]);

  // Trigger celebration effects if score increases or finishes
  useEffect(() => {
    if (!mounted) return;
    if (targetPct > prevPctRef.current && prevPctRef.current > 0) {
      playChime(targetPct === 100);

      if (targetPct === 100) {
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.4 },
            colors: ['#06b6d4', '#10b981', '#fbbf24', '#a855f7'],
          });
        } catch {
          // ignore
        }
      }
    }
    prevPctRef.current = targetPct;
  }, [targetPct, mounted]);

  const milestones = [
    { pct: 25, label: 'Jejak Awal', icon: Flag },
    { pct: 50, label: 'Setengah Misi', icon: Star },
    { pct: 75, label: 'Penjelajah Tangguh', icon: Sparkles },
    { pct: 100, label: 'Pulau Ditaklukkan', icon: Crown },
  ];

  return (
    <div className="w-full space-y-3.5">
      {/* Top row: Live counter & Status */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span suppressHydrationWarning>{completedCount}</span> / <span>{totalCount}</span> Topik Selesai
          </span>
          {isComplete && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Ekspedisi Tuntas!
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kemajuan</span>
          <motion.span
            suppressHydrationWarning
            className="text-2xl font-black font-mono tabular-nums bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            {displayPct}%
          </motion.span>
        </div>
      </div>

      {/* Progress Track & Animated Bar with Milestones */}
      <div className="relative">
        {/* Outer Glowing Track */}
        <div className="relative h-4 sm:h-5 rounded-full bg-slate-900/90 border border-cyan-500/30 overflow-hidden shadow-inner shadow-cyan-950/80 p-0.5">
          {/* Subtle background stripes */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 10px, transparent 10px, transparent 20px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Animated Fill Bar */}
          <motion.div
            className={`h-full rounded-full relative transition-all duration-300 overflow-hidden ${
              isComplete || displayPct >= 100
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 shadow-[0_0_15px_rgba(16,185,129,0.8)]'
                : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
            }`}
            style={{ width: mounted ? `${Math.min(100, Math.max(0, displayPct))}%` : `${targetPct}%` }}
          >
            {/* Shimmer sweep effect */}
            <div
              className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />

            {/* Glowing Leading Flare Particle */}
            {displayPct > 2 && (
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/90 rounded-full blur-[1px] shadow-[0_0_8px_#ffffff]" />
            )}
          </motion.div>
        </div>

        {/* Milestone Checkpoint Pins along the track */}
        <div className="absolute inset-x-0 -bottom-5 flex justify-between px-1 pointer-events-none">
          {milestones.map((m) => {
            const reached = displayPct >= m.pct;
            const Icon = m.icon;

            return (
              <div
                key={m.pct}
                className="flex flex-col items-center"
                style={{ position: 'relative', left: `${m.pct === 25 ? '-2%' : m.pct === 100 ? '1%' : '0'}` }}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border transition-all duration-300 ${
                    reached
                      ? 'bg-emerald-400 text-slate-950 border-white shadow-[0_0_10px_rgba(16,185,129,0.9)] scale-110'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span
                  className={`text-[9px] font-mono mt-0.5 tracking-tight transition-colors ${
                    reached ? 'text-cyan-300 font-extrabold' : 'text-slate-600'
                  }`}
                >
                  {m.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spacer for milestone labels */}
      <div className="h-2" />
    </div>
  );
}
