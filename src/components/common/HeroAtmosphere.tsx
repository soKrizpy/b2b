'use client';
// src/components/common/HeroAtmosphere.tsx
// High-performance, lightweight Anime.js v4 atmosphere for the Hero Realm banner.
// - Dark mode: Twinkling celestial stars, rotating quantum sparkles, and a flipped asteroid with glowing particle trail
// - Light mode: Seamless, full-width drifting clouds (no cut-offs) and soaring birds

import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export function HeroAtmosphere({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const asteroidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.offsetWidth || 1200;
    const animations: Array<{ pause?: () => void; revert?: () => void }> = [];

    // ── Dark Mode: Twinkling Cosmic Stars ────────────────────────────────────
    const starEls = container.querySelectorAll<HTMLElement>('.anime-star');
    if (starEls.length > 0) {
      const starAnim = animate(starEls, {
        opacity: [
          { to: 0.95, duration: 1500 },
          { to: 0.2, duration: 1500 },
        ],
        scale: [
          { to: 1.25, duration: 1500 },
          { to: 0.75, duration: 1500 },
        ],
        delay: stagger(160),
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      });
      animations.push(starAnim);
    }

    // ── Dark Mode: Rotating 4-point Quantum Sparkles ─────────────────────────
    const sparkleEls = container.querySelectorAll<HTMLElement>('.anime-sparkle');
    if (sparkleEls.length > 0) {
      const sparkleAnim = animate(sparkleEls, {
        rotate: [0, 180],
        scale: [
          { to: 1.3, duration: 1800 },
          { to: 0.7, duration: 1800 },
        ],
        opacity: [
          { to: 1, duration: 1800 },
          { to: 0.3, duration: 1800 },
        ],
        delay: stagger(400),
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      });
      animations.push(sparkleAnim);
    }

    // ── Dark Mode: Flipped Asteroid / Meteor Trajectory ──────────────────────
    const asteroidEl = asteroidRef.current;
    if (asteroidEl) {
      // Moves down and left across the card with the flipped head leading the way
      const asteroidAnim = animate(asteroidEl, {
        translateX: [0, -(width * 0.7 + 100)],
        translateY: [0, 240],
        opacity: [
          { to: 0, duration: 0 },
          { to: 0.95, duration: 250 },
          { to: 0.9, duration: 1400 },
          { to: 0, duration: 350 },
        ],
        duration: 2000,
        delay: 2500,
        loop: true,
        loopDelay: 8000,
        ease: 'outQuad',
      });
      animations.push(asteroidAnim);
    }

    // ── Light Mode: Full-Width Drifting Clouds (Never cut off in middle) ─────
    const cloud1 = container.querySelector<HTMLElement>('.anime-cloud-1');
    const cloud2 = container.querySelector<HTMLElement>('.anime-cloud-2');
    const cloud3 = container.querySelector<HTMLElement>('.anime-cloud-3');

    // Cloud 1: Foreground, travels from -260 to width + 60
    if (cloud1) {
      const c1Anim = animate(cloud1, {
        translateX: [-260, width + 80],
        duration: 32000,
        loop: true,
        ease: 'linear',
      });
      animations.push(c1Anim);
    }

    // Cloud 2: Midground, travels from -320 to width + 100 with offset start
    if (cloud2) {
      const c2Anim = animate(cloud2, {
        translateX: [-320, width + 100],
        duration: 44000,
        delay: -18000, // already mid-sky on load so sky is not empty
        loop: true,
        ease: 'linear',
      });
      animations.push(c2Anim);
    }

    // Cloud 3: Background wisp, steady slow drift
    if (cloud3) {
      const c3Anim = animate(cloud3, {
        translateX: [-220, width + 80],
        duration: 26000,
        delay: -8000,
        loop: true,
        ease: 'linear',
      });
      animations.push(c3Anim);
    }

    // ── Light Mode: Soaring Birds with Wave Motion ───────────────────────────
    const bird1 = container.querySelector<HTMLElement>('.anime-bird-1');
    const bird2 = container.querySelector<HTMLElement>('.anime-bird-2');

    if (bird1) {
      const b1Anim = animate(bird1, {
        translateX: [-80, width + 60],
        translateY: [
          { to: -10, duration: 1600, ease: 'inOutSine' },
          { to: 8, duration: 2000, ease: 'inOutSine' },
          { to: -4, duration: 1800, ease: 'inOutSine' },
          { to: 4, duration: 1600, ease: 'inOutSine' },
        ],
        duration: 18000,
        loop: true,
        ease: 'linear',
      });
      animations.push(b1Anim);
    }

    if (bird2) {
      const b2Anim = animate(bird2, {
        translateX: [-100, width + 60],
        translateY: [
          { to: 8, duration: 1900, ease: 'inOutSine' },
          { to: -8, duration: 2100, ease: 'inOutSine' },
          { to: 6, duration: 1700, ease: 'inOutSine' },
          { to: -2, duration: 1900, ease: 'inOutSine' },
        ],
        duration: 22000,
        delay: -7000,
        loop: true,
        ease: 'linear',
      });
      animations.push(b2Anim);
    }

    return () => {
      animations.forEach((anim) => {
        try {
          anim.pause?.();
          anim.revert?.();
        } catch {
          // Safe unmount
        }
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    >
      {/* ══════════════════════════════════════════════════════════════════
          DARK MODE: COSMIC STARRY REALM & FLIPPED ASTEROID
         ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden dark:block absolute inset-0">
        {/* Soft cosmic nebula ambient glow */}
        <div className="absolute -top-12 -right-12 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />

        {/* Twinkling Stars Array */}
        {[
          { top: '14%', left: '8%',  size: 'w-1 h-1' },
          { top: '22%', left: '22%', size: 'w-1.5 h-1.5' },
          { top: '15%', left: '38%', size: 'w-1 h-1' },
          { top: '30%', left: '54%', size: 'w-2 h-2' },
          { top: '12%', left: '72%', size: 'w-1.5 h-1.5' },
          { top: '24%', left: '88%', size: 'w-1 h-1' },
          { top: '64%', left: '12%', size: 'w-1.5 h-1.5' },
          { top: '78%', left: '28%', size: 'w-1 h-1' },
          { top: '56%', left: '46%', size: 'w-1.5 h-1.5' },
          { top: '84%', left: '68%', size: 'w-1 h-1' },
          { top: '68%', left: '84%', size: 'w-2 h-2' },
          { top: '42%', left: '92%', size: 'w-1 h-1' },
          { top: '88%', left: '42%', size: 'w-1.5 h-1.5' },
          { top: '40%', left: '4%',  size: 'w-1 h-1' },
        ].map((star, idx) => (
          <div
            key={idx}
            className={`anime-star absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] ${star.size}`}
            style={{ top: star.top, left: star.left, willChange: 'transform, opacity' }}
          />
        ))}

        {/* 4-Point Sparkling Stars with rotation */}
        <div
          className="anime-sparkle absolute top-[18%] left-[34%] w-4 h-4 text-purple-200 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]"
          style={{ willChange: 'transform, opacity' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        <div
          className="anime-sparkle absolute top-[58%] left-[74%] w-3.5 h-3.5 text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]"
          style={{ willChange: 'transform, opacity' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        {/* ── Flipped Asteroid with Trailing Sparkle Vector ──
            Positioned at top-right, moves down-left with head leading (flipped horizontally via scaleX(-1)) */}
        <div
          ref={asteroidRef}
          className="absolute -top-6 -right-6 w-32 h-16 pointer-events-none opacity-0"
          style={{ willChange: 'transform, opacity' }}
        >
          <svg
            viewBox="0 0 120 48"
            fill="none"
            className="w-full h-full -scale-x-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]"
            style={{ transformOrigin: 'center center' }}
          >
            <defs>
              <linearGradient id="asteroidGlowTail" x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#818cf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Blazing Comet Tail */}
            <path
              d="M 12 24 L 110 14 Q 116 24 110 34 Z"
              fill="url(#asteroidGlowTail)"
            />
            {/* Core White Streak */}
            <path
              d="M 38 24 L 110 18 Q 116 24 110 30 Z"
              fill="#ffffff"
              opacity="0.95"
            />
            {/* Asteroid Meteorite Head */}
            <circle cx="110" cy="24" r="6" fill="#ffffff" />
            <circle cx="111" cy="24" r="3.8" fill="#38bdf8" />
            <circle cx="112" cy="23" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LIGHT MODE: SILKY FULL-WIDTH CLOUDS & SOARING BIRDS
         ══════════════════════════════════════════════════════════════════ */}
      <div className="dark:hidden absolute inset-0">
        {/* Soft sunlight ambient glow */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-sky-300/20 blur-3xl" />

        {/* Cloud 1 — High & Soft Foreground */}
        <div
          className="anime-cloud-1 absolute top-1 left-0 w-60 text-white/30"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 120 50" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 25 40 A 18 18 0 0 1 55 30 A 24 24 0 0 1 95 35 A 15 15 0 0 1 105 45 L 20 45 A 12 12 0 0 1 25 40 Z" />
          </svg>
        </div>

        {/* Cloud 2 — Lower Midground */}
        <div
          className="anime-cloud-2 absolute -bottom-2 left-0 w-72 text-sky-100/25"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 140 55" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 30 45 A 20 20 0 0 1 65 32 A 28 28 0 0 1 110 38 A 18 18 0 0 1 125 50 L 22 50 A 14 14 0 0 1 30 45 Z" />
          </svg>
        </div>

        {/* Cloud 3 — Distant Compact Wisp */}
        <div
          className="anime-cloud-3 absolute top-12 left-0 w-44 text-white/20"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 100 45" fill="currentColor" className="w-full h-auto">
            <path d="M 20 35 A 15 15 0 0 1 45 25 A 20 20 0 0 1 80 30 A 12 12 0 0 1 85 40 L 15 40 A 10 10 0 0 1 20 35 Z" />
          </svg>
        </div>

        {/* Soaring Bird 1 */}
        <div
          className="anime-bird-1 absolute top-6 left-0 text-white/50 w-6 h-4"
          style={{ willChange: 'transform' }}
        >
          <svg
            viewBox="0 0 24 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="w-full h-full drop-shadow-sm"
          >
            <path d="M 1 8 Q 6 1 12 8 Q 18 1 23 8" />
          </svg>
        </div>

        {/* Soaring Bird 2 */}
        <div
          className="anime-bird-2 absolute top-14 left-0 text-white/40 w-4.5 h-3.5"
          style={{ willChange: 'transform' }}
        >
          <svg
            viewBox="0 0 24 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="w-full h-full"
          >
            <path d="M 1 8 Q 6 2 12 8 Q 18 2 23 8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
