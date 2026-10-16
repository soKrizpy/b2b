'use client';
// src/components/avatar/CyberFantasyAvatar.tsx
// Pure Layered SVG Cyber-Fantasy Student Avatar Engine.
// Ultra-crisp, instant load, theme-adaptive, multi-slot rendering.

import React from 'react';

export interface CyberFantasyAvatarProps {
  archetype?: string;          // 'cyber-mage' | 'astral-knight' | 'shadow-glitcher' | 'chrono-alchemist'
  skinTone?: string;           // 'default' | 'fair' | 'tan' | 'dark'
  hatId?: string | null;
  outfitId?: string | null;
  auraId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  isSelf?: boolean;
  animateIdle?: boolean;
}

const SIZE_MAP = {
  xs:  'w-6 h-6',
  sm:  'w-8 h-8',
  md:  'w-11 h-11',
  lg:  'w-16 h-16',
  xl:  'w-24 h-24',
  '2xl': 'w-36 h-36',
};

const SKIN_TONES: Record<string, { base: string; shadow: string }> = {
  default: { base: '#fde047', shadow: '#eab308' }, // cyber-warm gold / anime
  fair:    { base: '#fde68a', shadow: '#fcd34d' },
  tan:     { base: '#d97706', shadow: '#b45309' },
  dark:    { base: '#854d0e', shadow: '#713f12' },
};

export function CyberFantasyAvatar({
  archetype = 'cyber-mage',
  skinTone = 'default',
  hatId,
  outfitId,
  auraId,
  size = 'md',
  className = '',
  isSelf = false,
  animateIdle = true,
}: CyberFantasyAvatarProps) {
  const skin = SKIN_TONES[skinTone] || SKIN_TONES.default;
  const arch = archetype.toLowerCase();

  // Primary palette based on archetype
  const colors = {
    'cyber-mage':       { main: '#8b5cf6', accent: '#c084fc', hair: '#312e81', glow: '#a855f7' },
    'astral-knight':    { main: '#0ea5e9', accent: '#38bdf8', hair: '#0f172a', glow: '#38bdf8' },
    'shadow-glitcher':  { main: '#f43f5e', accent: '#fb7185', hair: '#18181b', glow: '#f43f5e' },
    'chrono-alchemist': { main: '#10b981', accent: '#34d399', hair: '#fef08a', glow: '#10b981' },
  }[arch] || { main: '#6366f1', accent: '#818cf8', hair: '#1e1b4b', glow: '#6366f1' };

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
      style={{ overflow: 'visible' }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-md ${animateIdle ? 'transition-transform duration-300 hover:scale-105' : ''}`}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id={`grad-bg-${arch}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.main} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.10" />
          </linearGradient>

          <linearGradient id={`grad-hair-${arch}`} x1="0" y1="0" x2="0" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors.hair} />
            <stop offset="100%" stopColor={colors.main} />
          </linearGradient>

          <filter id="glow-fx" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── LAYER 1: AURA FX (Behind character) ────────────────── */}
        {auraId === 'aura-matrix' && (
          <g opacity="0.85" className="animate-pulse">
            <circle cx="50" cy="50" r="46" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
            <text x="12" y="24" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">01</text>
            <text x="80" y="32" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">10</text>
            <text x="14" y="82" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">11</text>
            <text x="78" y="76" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">00</text>
          </g>
        )}

        {auraId === 'aura-quantum' && (
          <g opacity="0.9">
            <ellipse cx="50" cy="50" rx="46" ry="24" stroke="#c084fc" strokeWidth="2" strokeDasharray="6 3" transform="rotate(-25 50 50)" opacity="0.7" />
            <ellipse cx="50" cy="50" rx="46" ry="24" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" transform="rotate(35 50 50)" opacity="0.7" />
            <circle cx="20" cy="30" r="2.5" fill="#c084fc" />
            <circle cx="82" cy="72" r="2.5" fill="#38bdf8" />
          </g>
        )}

        {auraId === 'aura-glitch' && (
          <g opacity="0.85">
            <polygon points="12,18 20,14 18,24" fill="#06b6d4" opacity="0.8" />
            <polygon points="82,22 88,30 80,28" fill="#f43f5e" opacity="0.8" />
            <polygon points="18,78 26,82 22,72" fill="#06b6d4" opacity="0.8" />
            <polygon points="80,72 86,68 82,80" fill="#f43f5e" opacity="0.8" />
            <line x1="8" y1="50" x2="22" y2="50" stroke="#06b6d4" strokeWidth="2" />
            <line x1="78" y1="50" x2="92" y2="50" stroke="#f43f5e" strokeWidth="2" />
          </g>
        )}

        {auraId === 'aura-celestial' && (
          <g opacity="0.95">
            <circle cx="50" cy="50" r="47" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 4" />
            <polygon points="50,4 53,12 50,14 47,12" fill="#ffd700" />
            <polygon points="96,50 88,53 86,50 88,47" fill="#ffd700" />
            <polygon points="50,96 47,88 50,86 53,88" fill="#ffd700" />
            <polygon points="4,50 12,47 14,50 12,53" fill="#ffd700" />
            <circle cx="50" cy="50" r="44" stroke="#ffd700" strokeWidth="0.5" opacity="0.4" />
          </g>
        )}

        {/* ── LAYER 2: AVATAR SILHOUETTE & BASE CONTAINER ────────── */}
        <rect x="6" y="6" width="88" height="88" rx="28" fill={`url(#grad-bg-${arch})`} />
        <rect
          x="6" y="6" width="88" height="88" rx="28"
          stroke={colors.main} strokeWidth="2" strokeOpacity="0.4"
        />

        {/* ── LAYER 3: BODY / OUTFIT ──────────────────────────────── */}
        <g id="body-layer">
          {/* Neck */}
          <rect x="44" y="56" width="12" height="12" fill={skin.shadow} rx="2" />

          {/* Default / Cyber Academy Hoodie */}
          {(!outfitId || outfitId === 'outfit-cyber-hoodie') && (
            <g id="outfit-hoodie">
              <path d="M24 74 Q50 64 76 74 L84 94 L16 94 Z" fill="#1e293b" />
              <path d="M38 72 L50 88 L62 72 Z" fill="#3b82f6" />
              <line x1="50" y1="88" x2="50" y2="94" stroke="#06b6d4" strokeWidth="2" />
              <circle cx="50" cy="88" r="3" fill="#06b6d4" />
            </g>
          )}

          {/* Archmage Robe */}
          {outfitId === 'outfit-wizard-robe' && (
            <g id="outfit-robe">
              <path d="M22 72 Q50 62 78 72 L86 94 L14 94 Z" fill="#4c1d95" />
              <path d="M36 70 L50 90 L64 70 Z" fill="#8b5cf6" />
              {/* Rune stitching */}
              <circle cx="50" cy="82" r="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
              <line x1="32" y1="78" x2="42" y2="92" stroke="#c084fc" strokeWidth="1.5" />
              <line x1="68" y1="78" x2="58" y2="92" stroke="#c084fc" strokeWidth="1.5" />
            </g>
          )}

          {/* Astral Plate Armor */}
          {outfitId === 'outfit-astral-plate' && (
            <g id="outfit-plate">
              <path d="M22 70 Q50 60 78 70 L86 94 L14 94 Z" fill="#0369a1" />
              <polygon points="34,70 66,70 58,92 42,92" fill="#0284c7" />
              {/* Arc Reactor Core */}
              <circle cx="50" cy="80" r="5" fill="#38bdf8" />
              <circle cx="50" cy="80" r="3" fill="#ffffff" />
              <line x1="30" y1="74" x2="40" y2="74" stroke="#38bdf8" strokeWidth="2" />
              <line x1="60" y1="74" x2="70" y2="74" stroke="#38bdf8" strokeWidth="2" />
            </g>
          )}

          {/* Shinobi Gi */}
          {outfitId === 'outfit-shinobi-suit' && (
            <g id="outfit-shinobi">
              <path d="M22 72 Q50 62 78 72 L86 94 L14 94 Z" fill="#09090b" />
              <path d="M34 68 L50 86 L66 68 Z" fill="#f43f5e" />
              <path d="M38 74 L50 88 L62 74 Z" fill="#18181b" />
              <line x1="50" y1="88" x2="50" y2="94" stroke="#f43f5e" strokeWidth="2" />
            </g>
          )}

          {/* Chrono Coat */}
          {outfitId === 'outfit-chrono-coat' && (
            <g id="outfit-chrono">
              <path d="M20 72 Q50 60 80 72 L88 94 L12 94 Z" fill="#065f46" />
              <path d="M36 68 L50 86 L64 68 Z" fill="#10b981" />
              {/* Golden Chrono Gear */}
              <circle cx="50" cy="82" r="4.5" fill="#f59e0b" />
              <circle cx="50" cy="82" r="2" fill="#065f46" />
              <line x1="28" y1="76" x2="72" y2="76" stroke="#f59e0b" strokeWidth="1.5" />
            </g>
          )}
        </g>

        {/* ── LAYER 4: HEAD & FACE ─────────────────────────────────── */}
        <g id="head-layer">
          {/* Head Shape */}
          <rect x="28" y="26" width="44" height="42" rx="20" fill={skin.base} />

          {/* Elf Ears for Chrono Alchemist */}
          {arch === 'chrono-alchemist' && (
            <g id="elf-ears">
              <polygon points="28,42 16,36 28,48" fill={skin.base} />
              <polygon points="72,42 84,36 72,48" fill={skin.base} />
              <line x1="19" y1="38" x2="27" y2="44" stroke="#10b981" strokeWidth="1" />
            </g>
          )}

          {/* Hair Base */}
          <g id="hair-base">
            {arch === 'cyber-mage' && (
              <path d="M26 38 C26 22 74 22 74 38 C74 34 66 26 50 26 C34 26 26 34 26 38 Z" fill={`url(#grad-hair-${arch})`} />
            )}
            {arch === 'astral-knight' && (
              <path d="M26 36 C28 20 72 20 74 36 C70 28 62 24 50 24 C38 24 30 28 26 36 Z" fill={`url(#grad-hair-${arch})`} />
            )}
            {arch === 'shadow-glitcher' && (
              <path d="M24 40 L34 22 L50 26 L66 22 L76 40 C70 30 60 26 50 26 C40 26 30 30 24 40 Z" fill={`url(#grad-hair-${arch})`} />
            )}
            {arch === 'chrono-alchemist' && (
              <path d="M26 42 C26 24 74 24 74 42 C72 32 64 26 50 26 C36 26 28 32 26 42 Z" fill="#fde047" />
            )}
          </g>

          {/* Eyes */}
          <g id="eyes">
            {/* Left Eye */}
            <circle cx="40" cy="46" r="3.5" fill="#0f172a" />
            <circle cx="41" cy="45" r="1.2" fill="#ffffff" />
            {/* Right Eye */}
            <circle cx="60" cy="46" r="3.5" fill="#0f172a" />
            <circle cx="61" cy="45" r="1.2" fill="#ffffff" />

            {/* Cyber Eye glow for Shinobi */}
            {arch === 'shadow-glitcher' && (
              <circle cx="40" cy="46" r="2.2" fill="#f43f5e" />
            )}
            {/* Cyber Eye glow for Mage */}
            {arch === 'cyber-mage' && (
              <circle cx="60" cy="46" r="2.2" fill="#a855f7" />
            )}
          </g>

          {/* Mouth & Expression */}
          <path d="M46 56 Q50 60 54 56" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>

        {/* ── LAYER 5: HEADGEAR & ACCESSORIES ──────────────────────── */}
        {hatId && (
          <g id="headgear-layer">
            {/* Bandana Coder */}
            {hatId === 'rookie-band' && (
              <g id="acc-rookie-band">
                <rect x="26" y="32" width="48" height="8" rx="3" fill="#3b82f6" />
                <circle cx="50" cy="36" r="2.5" fill="#ffffff" />
                <path d="M26 36 L18 42 L24 44 Z" fill="#2563eb" />
              </g>
            )}

            {/* Topi Hacker */}
            {hatId === 'topi-hacker' && (
              <g id="acc-topi-hacker">
                <path d="M24 34 C24 20 76 20 76 34 Z" fill="#0284c7" />
                <rect x="22" y="32" width="56" height="5" rx="2" fill="#0ea5e9" />
                {/* HUD Visor bill */}
                <path d="M30 37 L70 37 L82 43 L18 43 Z" fill="#06b6d4" opacity="0.85" />
                <line x1="26" y1="40" x2="74" y2="40" stroke="#38bdf8" strokeWidth="1" />
              </g>
            )}

            {/* Topi Dino */}
            {hatId === 'dino-cap' && (
              <g id="acc-dino-cap">
                <path d="M26 34 C26 22 74 22 74 34 Z" fill="#10b981" />
                {/* Spikes */}
                <polygon points="40,24 44,16 48,24" fill="#059669" />
                <polygon points="52,24 56,16 60,24" fill="#059669" />
                <circle cx="36" cy="30" r="2.5" fill="#ffffff" />
                <circle cx="37" cy="30" r="1.2" fill="#064e3b" />
                <circle cx="64" cy="30" r="2.5" fill="#ffffff" />
                <circle cx="63" cy="30" r="1.2" fill="#064e3b" />
              </g>
            )}

            {/* Ninja Headband */}
            {hatId === 'ninja-headband' && (
              <g id="acc-ninja-band">
                <rect x="24" y="33" width="52" height="7" rx="2" fill="#dc2626" />
                {/* Metal plate */}
                <rect x="42" y="33" width="16" height="7" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                <circle cx="50" cy="36.5" r="1.5" fill="#ef4444" />
                {/* Tails */}
                <path d="M24 36 L16 42 L20 46 L26 38 Z" fill="#991b1b" />
              </g>
            )}

            {/* Archmage Hood */}
            {hatId === 'tudung-wizard' && (
              <g id="acc-wizard-hood">
                <path d="M22 40 C20 16 80 16 78 40 L74 54 C70 42 30 42 26 54 Z" fill="#6b21a8" />
                <circle cx="50" cy="22" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <path d="M24 38 Q50 30 76 38" stroke="#a855f7" strokeWidth="2" fill="none" />
              </g>
            )}

            {/* RGB Cat Headset */}
            {hatId === 'headset-cat' && (
              <g id="acc-cat-headset">
                {/* Band */}
                <path d="M20 42 C20 18 80 18 80 42" stroke="#ec4899" strokeWidth="4" fill="none" strokeLinecap="round" />
                {/* Cat ears */}
                <polygon points="26,26 32,12 40,22" fill="#f43f5e" stroke="#fda4af" strokeWidth="1" />
                <polygon points="74,26 68,12 60,22" fill="#f43f5e" stroke="#fda4af" strokeWidth="1" />
                {/* Ear cushions */}
                <rect x="16" y="38" width="8" height="16" rx="4" fill="#be185d" />
                <rect x="76" y="38" width="8" height="16" rx="4" fill="#be185d" />
              </g>
            )}

            {/* Pro Gamer Headset */}
            {hatId === 'headset-pro' && (
              <g id="acc-gamer-headset">
                <path d="M20 42 C20 18 80 18 80 42" stroke="#d97706" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                <rect x="16" y="38" width="8" height="16" rx="3" fill="#f59e0b" />
                <rect x="76" y="38" width="8" height="16" rx="3" fill="#f59e0b" />
                {/* Mic */}
                <path d="M20 52 Q30 64 42 62" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
                <circle cx="43" cy="62" r="2.5" fill="#ef4444" />
              </g>
            )}

            {/* HUD Scouter Visor */}
            {hatId === 'visor-neon' && (
              <g id="acc-hud-visor">
                <rect x="32" y="42" width="22" height="10" rx="3" fill="#00f0ff" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1.2" />
                <line x1="32" y1="47" x2="20" y2="44" stroke="#0284c7" strokeWidth="2" />
                <line x1="36" y1="45" x2="48" y2="45" stroke="#ffffff" strokeWidth="1" />
              </g>
            )}

            {/* VR Goggles */}
            {hatId === 'vr-goggles' && (
              <g id="acc-vr-goggles">
                <rect x="28" y="40" width="44" height="15" rx="5" fill="#4c1d95" stroke="#a855f7" strokeWidth="1.5" />
                <rect x="32" y="43" width="36" height="9" rx="3" fill="#8b5cf6" fillOpacity="0.8" />
                <line x1="36" y1="47.5" x2="64" y2="47.5" stroke="#00f0ff" strokeWidth="1.5" />
              </g>
            )}

            {/* Golden Quantum Halo */}
            {hatId === 'golden-halo' && (
              <g id="acc-golden-halo">
                <ellipse cx="50" cy="18" rx="26" ry="6" stroke="#ffd700" strokeWidth="3" fill="none" filter="url(#glow-fx)" />
                <circle cx="28" cy="18" r="2" fill="#ffffff" />
                <circle cx="72" cy="18" r="2" fill="#ffffff" />
              </g>
            )}

            {/* Cyber Crown */}
            {hatId === 'cyber-crown' && (
              <g id="acc-cyber-crown">
                <polygon points="30,30 36,14 44,24 50,10 56,24 64,14 70,30" fill="#ffd700" stroke="#b45309" strokeWidth="1" />
                <circle cx="50" cy="16" r="2" fill="#38bdf8" />
                <circle cx="38" cy="20" r="1.5" fill="#ec4899" />
                <circle cx="62" cy="20" r="1.5" fill="#ec4899" />
                <rect x="30" y="28" width="40" height="4" rx="1" fill="#f59e0b" />
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Online indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />

      {/* YOU Tag */}
      {isSelf && (
        <span className="absolute -top-1.5 -right-1 text-[7px] bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full leading-tight shadow-sm">
          YOU
        </span>
      )}
    </div>
  );
}
