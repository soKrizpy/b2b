'use client';
// src/components/common/HeroAtmosphere.tsx
// Seamless, high-performance GPU atmospheric animation for Hero Welcome Card.
// - Light mode: Silky gliding clouds, organic soaring birds with flapping wings, and warm sun dust
// - Dark mode: Shimmering twinkling stars, 4-point quantum sparkles, and smooth celestial shooting star

import React from 'react';

export function HeroAtmosphere({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    >
      {/* ══════════════════════════════════════════════════════════════════
          DARK MODE: COSMIC STARRY REALM & CELESTIAL COMET
         ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden dark:block absolute inset-0">
        {/* Soft cosmic nebula ambient breathing glow */}
        <div
          className="absolute -top-12 -right-12 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl"
          style={{ animation: 'heroAmbientBreathing 6s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl"
          style={{ animation: 'heroAmbientBreathing 8s ease-in-out infinite 2s' }}
        />

        {/* Twinkling Stars Array with unique positions, sizes, and out-of-phase delays */}
        {[
          { top: '14%', left: '10%', size: 'w-1 h-1',       delay: '0s',    dur: '2.4s' },
          { top: '22%', left: '24%', size: 'w-1.5 h-1.5',   delay: '0.6s',  dur: '3.1s' },
          { top: '15%', left: '42%', size: 'w-1 h-1',       delay: '1.2s',  dur: '2.8s' },
          { top: '28%', left: '60%', size: 'w-2 h-2',       delay: '0.3s',  dur: '3.5s' },
          { top: '12%', left: '78%', size: 'w-1.5 h-1.5',   delay: '1.8s',  dur: '2.6s' },
          { top: '20%', left: '92%', size: 'w-1 h-1',       delay: '0.9s',  dur: '3.2s' },
          { top: '62%', left: '14%', size: 'w-1.5 h-1.5',   delay: '1.5s',  dur: '2.9s' },
          { top: '78%', left: '30%', size: 'w-1 h-1',       delay: '0.4s',  dur: '3.4s' },
          { top: '55%', left: '52%', size: 'w-1.5 h-1.5',   delay: '1.1s',  dur: '2.7s' },
          { top: '82%', left: '72%', size: 'w-1 h-1',       delay: '2.1s',  dur: '3.0s' },
          { top: '68%', left: '88%', size: 'w-2 h-2',       delay: '0.7s',  dur: '3.6s' },
          { top: '44%', left: '84%', size: 'w-1 h-1',       delay: '1.4s',  dur: '2.5s' },
          { top: '88%', left: '48%', size: 'w-1.5 h-1.5',   delay: '1.9s',  dur: '3.3s' },
          { top: '38%', left: '6%',  size: 'w-1 h-1',       delay: '0.2s',  dur: '2.9s' },
        ].map((star, idx) => (
          <div
            key={idx}
            className={`absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] ${star.size}`}
            style={{
              top: star.top,
              left: star.left,
              animation: `starTwinkleGlow ${star.dur} ease-in-out infinite`,
              animationDelay: star.delay,
              willChange: 'transform, opacity',
            }}
          />
        ))}

        {/* 4-Point Sparkling Stars */}
        <div
          className="absolute top-[18%] left-[36%] w-4 h-4 text-purple-200 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]"
          style={{ animation: 'starTwinkleGlow 3.8s ease-in-out infinite 0.5s', willChange: 'transform, opacity' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        <div
          className="absolute top-[58%] left-[76%] w-3.5 h-3.5 text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]"
          style={{ animation: 'starTwinkleGlow 4.2s ease-in-out infinite 1.6s', willChange: 'transform, opacity' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        {/* Celestial Shooting Star Comet */}
        <div
          className="absolute top-2 left-1/4 w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-white rounded-full shadow-[0_0_10px_rgba(34,211,238,0.9)]"
          style={{
            animation: 'cosmicCometGlide 9s cubic-bezier(0.16, 1, 0.3, 1) infinite 3s',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LIGHT MODE: SILKY DRIFTING CLOUDS & SOARING BIRDS
         ══════════════════════════════════════════════════════════════════ */}
      <div className="dark:hidden absolute inset-0">
        {/* Soft sunlight ambient glow */}
        <div
          className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/25 blur-3xl"
          style={{ animation: 'heroAmbientBreathing 5s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-sky-300/20 blur-3xl"
          style={{ animation: 'heroAmbientBreathing 7s ease-in-out infinite 1.5s' }}
        />

        {/* Cloud Layer 1 — High & Soft Foreground */}
        <div
          className="absolute top-1 left-0 w-56 text-white/30"
          style={{
            animation: 'heroCloudDrift1 28s linear infinite',
            willChange: 'transform',
          }}
        >
          <svg viewBox="0 0 120 50" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 25 40 A 18 18 0 0 1 55 30 A 24 24 0 0 1 95 35 A 15 15 0 0 1 105 45 L 20 45 A 12 12 0 0 1 25 40 Z" />
          </svg>
        </div>

        {/* Cloud Layer 2 — Lower Midground, Offset Speed */}
        <div
          className="absolute -bottom-2 left-0 w-72 text-sky-100/25"
          style={{
            animation: 'heroCloudDrift2 38s linear infinite -14s',
            willChange: 'transform',
          }}
        >
          <svg viewBox="0 0 140 55" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 30 45 A 20 20 0 0 1 65 32 A 28 28 0 0 1 110 38 A 18 18 0 0 1 125 50 L 22 50 A 14 14 0 0 1 30 45 Z" />
          </svg>
        </div>

        {/* Cloud Layer 3 — Distant Compact Wisp */}
        <div
          className="absolute top-12 left-0 w-44 text-white/20"
          style={{
            animation: 'heroCloudDrift1 22s linear infinite -8s',
            willChange: 'transform',
          }}
        >
          <svg viewBox="0 0 100 45" fill="currentColor" className="w-full h-auto">
            <path d="M 20 35 A 15 15 0 0 1 45 25 A 20 20 0 0 1 80 30 A 12 12 0 0 1 85 40 L 15 40 A 10 10 0 0 1 20 35 Z" />
          </svg>
        </div>

        {/* Soaring Bird 1 — Graceful S-curve Flight with Flapping Wings */}
        <div
          className="absolute top-6 left-0 text-white/45 w-6 h-4"
          style={{
            animation: 'heroBirdFly1 16s linear infinite',
            willChange: 'transform',
          }}
        >
          <svg
            viewBox="0 0 24 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="w-full h-full drop-shadow-sm"
            style={{
              animation: 'heroBirdFlap 0.75s ease-in-out infinite',
              transformOrigin: 'center center',
            }}
          >
            <path d="M 1 8 Q 6 1 12 8 Q 18 1 23 8" />
          </svg>
        </div>

        {/* Soaring Bird 2 — Companion Flight Offset */}
        <div
          className="absolute top-12 left-0 text-white/35 w-4.5 h-3.5"
          style={{
            animation: 'heroBirdFly2 19s linear infinite -6s',
            willChange: 'transform',
          }}
        >
          <svg
            viewBox="0 0 24 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="w-full h-full"
            style={{
              animation: 'heroBirdFlap 0.65s ease-in-out infinite 0.2s',
              transformOrigin: 'center center',
            }}
          >
            <path d="M 1 8 Q 6 2 12 8 Q 18 2 23 8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
