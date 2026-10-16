'use client';
// src/components/common/HeroAtmosphere.tsx
// Ambient anime.js background atmosphere for adaptive hero banners:
// - Light mode: Gentle drifting clouds and soaring birds
// - Dark mode: Twinkling cosmic stars

import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export function HeroAtmosphere({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Dark mode twinkling stars
    const stars = el.querySelectorAll<HTMLElement>('.anime-star');
    let starAnim: { revert?: () => void } | null = null;
    if (stars.length > 0) {
      starAnim = animate(stars, {
        opacity: [
          { to: 0.95, duration: 1200 },
          { to: 0.2, duration: 1200 },
        ],
        scale: [
          { to: 1.3, duration: 1200 },
          { to: 0.8, duration: 1200 },
        ],
        delay: stagger(180),
        loop: true,
        ease: 'inOutSine',
      });
    }

    // Light mode drifting clouds
    const clouds = el.querySelectorAll<HTMLElement>('.anime-cloud');
    let cloudAnim: { revert?: () => void } | null = null;
    if (clouds.length > 0) {
      cloudAnim = animate(clouds, {
        translateX: ['-30%', '130%'],
        duration: stagger([26000, 35000]),
        delay: stagger(4000),
        loop: true,
        ease: 'linear',
      });
    }

    // Light mode gliding birds
    const birds = el.querySelectorAll<HTMLElement>('.anime-bird');
    let birdAnim: { revert?: () => void } | null = null;
    if (birds.length > 0) {
      birdAnim = animate(birds, {
        translateX: ['-20%', '130%'],
        translateY: [
          { to: -12, duration: 1800, ease: 'inOutQuad' },
          { to: 8, duration: 2200, ease: 'inOutQuad' },
          { to: 0, duration: 1600, ease: 'inOutQuad' },
        ],
        duration: stagger([15000, 20000]),
        delay: stagger(3200),
        loop: true,
        ease: 'linear',
      });
    }

    return () => {
      try {
        starAnim?.revert?.();
        cloudAnim?.revert?.();
        birdAnim?.revert?.();
      } catch {
        // Safe cleanup
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    >
      {/* ── Dark Mode: Twinkling Stars (hidden in light mode) ── */}
      <div className="hidden dark:block absolute inset-0">
        {/* Star coordinates spread across banner */}
        {[
          { top: '15%', left: '12%', size: 'w-1 h-1' },
          { top: '28%', left: '32%', size: 'w-1.5 h-1.5' },
          { top: '18%', left: '55%', size: 'w-1 h-1' },
          { top: '35%', left: '72%', size: 'w-2 h-2' },
          { top: '12%', left: '88%', size: 'w-1.5 h-1.5' },
          { top: '65%', left: '18%', size: 'w-1.5 h-1.5' },
          { top: '78%', left: '42%', size: 'w-1 h-1' },
          { top: '55%', left: '60%', size: 'w-1.5 h-1.5' },
          { top: '80%', left: '78%', size: 'w-1 h-1' },
          { top: '70%', left: '92%', size: 'w-2 h-2' },
          { top: '45%', left: '8%', size: 'w-1 h-1' },
          { top: '85%', left: '26%', size: 'w-1.5 h-1.5' },
        ].map((pos, idx) => (
          <div
            key={idx}
            className={`anime-star absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] opacity-30 ${pos.size}`}
            style={{ top: pos.top, left: pos.left }}
          />
        ))}

        {/* 4-point sparkle stars */}
        <svg
          className="anime-star absolute top-[20%] left-[45%] w-3.5 h-3.5 text-purple-200 opacity-40 drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
        <svg
          className="anime-star absolute top-[60%] left-[82%] w-3 h-3 text-cyan-200 opacity-40 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* ── Light Mode: Drifting Clouds & Birds (hidden in dark mode) ── */}
      <div className="dark:hidden absolute inset-0">
        {/* Cloud 1 */}
        <div
          className="anime-cloud absolute top-3 left-0 opacity-25 w-44 text-white"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 100 45" fill="currentColor">
            <path d="M 20 35 A 15 15 0 0 1 45 25 A 20 20 0 0 1 80 30 A 12 12 0 0 1 85 40 L 15 40 A 10 10 0 0 1 20 35 Z" />
          </svg>
        </div>

        {/* Cloud 2 */}
        <div
          className="anime-cloud absolute bottom-2 left-0 opacity-20 w-56 text-sky-100"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 120 50" fill="currentColor">
            <path d="M 25 40 A 18 18 0 0 1 55 30 A 24 24 0 0 1 95 35 A 15 15 0 0 1 105 45 L 20 45 A 12 12 0 0 1 25 40 Z" />
          </svg>
        </div>

        {/* Bird 1 */}
        <div
          className="anime-bird absolute top-7 left-0 opacity-35 text-white w-5 h-4"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M 1 8 Q 6 1 12 8 Q 18 1 23 8" />
          </svg>
        </div>

        {/* Bird 2 */}
        <div
          className="anime-bird absolute top-14 left-0 opacity-30 text-white w-4 h-3.5"
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M 1 8 Q 6 2 12 8 Q 18 2 23 8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
