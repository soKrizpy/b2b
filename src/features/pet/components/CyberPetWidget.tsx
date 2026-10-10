'use client';
// src/features/pet/components/CyberPetWidget.tsx
// Main-stage Cyber Pet widget for the Student Dashboard.
//
// Animations (Anime.js v4 — named export `animate`):
//   • Idle float  : continuous Y oscillation on the avatar
//   • Shadow pulse: opacity/scale inversely synced to the float
//   • Click/hover bounce: elastic scale + rotation burst on interaction
//
// All data-pet-* attributes preserved for Antigravity styling hooks.

import { useState, useEffect, useRef, useCallback } from 'react';
import { animate } from 'animejs';
import { calculateLevel, getPetStatus } from '../lib/levelCalc';
import type { StudentGamificationData } from '../lib/petQueries';

// ── Default SVG avatar ────────────────────────────────────────────────────────

function DefaultPetSVG() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" className="w-full h-full">
      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#6366f1" />
      <circle cx="40" cy="28" r="18" fill="#818cf8" />
      <circle cx="33" cy="26" r="3.5" fill="white" />
      <circle cx="47" cy="26" r="3.5" fill="white" />
      <circle cx="34" cy="27" r="1.8" fill="#1e1b4b" />
      <circle cx="48" cy="27" r="1.8" fill="#1e1b4b" />
      <circle cx="35" cy="26" r="0.8" fill="white" />
      <circle cx="49" cy="26" r="0.8" fill="white" />
      <path d="M33 33 Q40 39 47 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M25 16 L20 6 L30 12 Z" fill="#818cf8" />
      <path d="M55 16 L60 6 L50 12 Z" fill="#818cf8" />
      <path d="M62 52 Q72 44 68 38" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PetAvatar({ avatarId }: { avatarId: string | null }) {
  const [hasImageError, setHasImageError] = useState(false);
  if (avatarId && !hasImageError) {
    return (
      <img
        src={`/pets/${avatarId}.png`}
        alt={`Pet avatar ${avatarId}`}
        className="w-full h-full object-contain"
        onError={() => setHasImageError(true)}
      />
    );
  }
  return <DefaultPetSVG />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CyberPetWidgetProps extends StudentGamificationData {
  justLevelledUp?: boolean;
  compact?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CyberPetWidget({
  avatarId,
  fullName,
  totalXp,
  coins,
  justLevelledUp = false,
  compact = false,
}: CyberPetWidgetProps) {
  const level  = calculateLevel(totalXp);
  const status = getPetStatus(level.progressPercent, justLevelledUp);

  // Refs for the animated elements
  const avatarRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // ── Idle float animation ──────────────────────────────────────────────────
  useEffect(() => {
    // Skip in compact (hero-card) mode — animations only on the main stage
    if (compact) return;

    const avatarEl = avatarRef.current;
    const shadowEl = shadowRef.current;
    if (!avatarEl) return;

    // Avatar floats up and down
    const floatAnim = animate(avatarEl, {
      translateY: ['-6px', '6px'],
      duration:    2200,
      direction:  'alternate',
      loop:        true,
      easing:     'easeInOutSine',
    });

    // Shadow scales inversely — when avatar is up, shadow shrinks (depth illusion)
    let shadowAnim: ReturnType<typeof animate> | null = null;
    if (shadowEl) {
      shadowAnim = animate(shadowEl, {
        scaleX:   [1, 0.7],
        opacity:  [0.35, 0.15],
        duration:  2200,
        direction: 'alternate',
        loop:      true,
        easing:    'easeInOutSine',
      });
    }

    return () => {
      floatAnim.pause();
      shadowAnim?.pause();
    };
  }, [compact]);

  // ── Bounce on click / hover ───────────────────────────────────────────────
  const handleBounce = useCallback(() => {
    if (compact || !avatarRef.current) return;
    animate(avatarRef.current, {
      keyframes: [
        { scale: 1,    rotate: '0deg'  },
        { scale: 1.18, rotate: '-6deg' },
        { scale: 0.95, rotate: '6deg'  },
        { scale: 1,    rotate: '0deg'  },
      ],
      duration: 600,
      easing:   'outElastic',
    });
  }, [compact]);

  return (
    <section
      data-pet-widget
      aria-label={`Cyber Pet untuk ${fullName}`}
      className={`flex ${compact ? 'flex-row items-center gap-4' : 'flex-col items-center gap-5'}`}
    >
      {/* ── Avatar stage ─────────────────────────────────────────── */}
      <div className={`flex flex-col items-center gap-2 ${compact ? '' : 'w-full'}`}>

        {/* The animated avatar wrapper */}
        <div
          ref={avatarRef}
          data-pet-avatar
          className={`relative flex-shrink-0 cursor-pointer select-none
            ${compact ? 'w-20 h-20' : 'w-36 h-36'}`}
          onClick={handleBounce}
          onMouseEnter={handleBounce}
          role="img"
          aria-label={`Pet ${fullName} — klik untuk berinteraksi`}
        >
          {/* Level badge */}
          <div
            data-pet-level-badge
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full
              bg-indigo-600 text-white text-xs font-extrabold
              flex items-center justify-center ring-2 ring-white shadow-md"
            aria-label={`Level ${level.currentLevel}`}
          >
            {level.currentLevel}
          </div>

          {/* Avatar image */}
          <div className="w-full h-full rounded-2xl overflow-hidden bg-indigo-50
            ring-2 ring-indigo-200 shadow-lg p-1">
            <PetAvatar avatarId={avatarId} />
          </div>
        </div>

        {/* Ground shadow — scales opposite to the float */}
        {!compact && (
          <div
            ref={shadowRef}
            aria-hidden="true"
            className="w-20 h-3 rounded-full bg-indigo-900/20 blur-sm"
            style={{ transformOrigin: 'center' }}
          />
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div
        data-pet-stats
        className={`flex flex-col gap-3 ${compact ? 'flex-1 min-w-0' : 'w-full'}`}
      >
        {/* Status message */}
        <p
          data-pet-status
          className="text-sm font-bold text-indigo-700 text-center flex items-center justify-center gap-1.5"
          aria-live="polite"
        >
          <i className="fa-solid fa-heart-pulse text-rose-500 fa-beat text-xs" aria-hidden="true" />
          {status}
        </p>

        {/* XP bar */}
        <div data-pet-xp-bar>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">
              XP Level {level.currentLevel}
            </span>
            <span aria-label={`${level.xpInCurrentLevel} dari ${level.xpNeededThisLevel} XP`}>
              {level.xpInCurrentLevel} / {level.xpNeededThisLevel}
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={level.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress ke level ${level.currentLevel + 1}: ${level.progressPercent}%`}
            className="h-3 rounded-full bg-slate-100 overflow-hidden"
          >
            <div
              data-pet-xp-fill
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500
                transition-[width] duration-700 ease-out"
              style={{ width: `${level.progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 mt-1 text-right">
            Total:{' '}
            <span data-pet-total-xp className="font-semibold text-slate-600">
              {totalXp}
            </span>{' '}
            XP
          </p>
        </div>

        {/* Coin counter */}
        <div
          data-pet-coins
          className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20
            rounded-2xl px-4 py-2 w-fit group/coin shadow-sm"
          aria-label={`${coins} koin`}
        >
          <i className="fa-solid fa-coins text-amber-400 text-lg group-hover/coin:fa-bounce" aria-hidden="true" />
          <span
            data-pet-coin-count
            className="text-base font-black text-amber-600 dark:text-amber-300 tabular-nums"
          >
            {coins.toLocaleString('id-ID')}
          </span>
          <span className="text-xs text-amber-600/80 dark:text-amber-300/80 font-bold">Koin</span>
        </div>
      </div>
    </section>
  );
}
