'use client';
// src/components/avatar/CyberPetRenderer.tsx
// Pure Vector SVG Cyber Companion Pet Renderer.
// Renders all companion pet species + equipped pet accessories & auras.

import React from 'react';

export interface CyberPetRendererProps {
  petId?: string | null;       // 'pet-cat' | 'pet-fox' | 'pet-dragon' | 'pet-robot' | 'pet-bunny' | 'pet-owl' | 'pet-dog' or raw 'cat' etc.
  petHatId?: string | null;    // 'pet-bowtie' | 'pet-mini-scouter' | 'pet-mini-crown' | 'pet-angel-halo'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animate?: boolean;
}

const SIZE_MAP = {
  xs:  'w-6 h-6',
  sm:  'w-8 h-8',
  md:  'w-12 h-12',
  lg:  'w-18 h-18',
  xl:  'w-28 h-28',
  '2xl': 'w-36 h-36',
};

// Normalize pet id string (e.g. 'cat' or 'pet-cat' -> 'cat')
function normalizePetId(id: string | null | undefined): string {
  if (!id) return 'cat';
  const clean = id.replace('pet-', '').toLowerCase();
  if (['cat', 'fox', 'dragon', 'robot', 'bunny', 'owl', 'dog'].includes(clean)) {
    return clean;
  }
  return 'cat';
}

export function CyberPetRenderer({
  petId = 'cat',
  petHatId,
  size = 'md',
  className = '',
  animate = true,
}: CyberPetRendererProps) {
  const species = normalizePetId(petId);

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
      style={{ overflow: 'visible' }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-md ${animate ? 'transition-transform duration-300 hover:scale-105' : ''}`}
      >
        <defs>
          <filter id="pet-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── PET SPECIES SILHOUETTES ────────────────────────────── */}

        {/* 🐱 CAT / CYBER NEKO */}
        {species === 'cat' && (
          <g id="species-cat">
            {/* Body */}
            <ellipse cx="50" cy="62" rx="28" ry="22" fill="#6366f1" />
            {/* Belly */}
            <ellipse cx="50" cy="64" rx="16" ry="14" fill="#818cf8" />
            {/* Tail */}
            <path d="M74 68 Q88 62 86 48 Q84 40 76 44" stroke="#6366f1" strokeWidth="6" strokeLinecap="round" fill="none" />
            {/* Head */}
            <circle cx="50" cy="38" r="22" fill="#818cf8" />
            {/* Ears */}
            <polygon points="32,24 24,10 40,18" fill="#6366f1" />
            <polygon points="32,22 27,14 38,18" fill="#fda4af" />
            <polygon points="68,24 76,10 60,18" fill="#6366f1" />
            <polygon points="68,22 73,14 62,18" fill="#fda4af" />
            {/* Eyes */}
            <ellipse cx="42" cy="36" rx="4" ry="5" fill="#1e1b4b" />
            <circle cx="43.5" cy="34.5" r="1.5" fill="#ffffff" />
            <ellipse cx="58" cy="36" rx="4" ry="5" fill="#1e1b4b" />
            <circle cx="59.5" cy="34.5" r="1.5" fill="#ffffff" />
            {/* Nose & Mouth */}
            <polygon points="50,42 47,39 53,39" fill="#ec4899" />
            <path d="M44 45 Q50 50 56 45" stroke="#1e1b4b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            {/* Whiskers */}
            <line x1="28" y1="40" x2="38" y2="42" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="26" y1="45" x2="38" y2="45" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="72" y1="40" x2="62" y2="42" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="74" y1="45" x2="62" y2="45" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}

        {/* 🦊 FOX / KITSUNE NEON */}
        {species === 'fox' && (
          <g id="species-fox">
            {/* Body */}
            <ellipse cx="50" cy="62" rx="26" ry="20" fill="#ea580c" />
            {/* Tail */}
            <path d="M72 64 C90 56 94 36 82 28 C74 44 76 60 72 64 Z" fill="#f97316" />
            <polygon points="88,32 94,36 84,44" fill="#ffffff" />
            {/* Head */}
            <polygon points="50,56 26,34 74,34" fill="#f97316" />
            <polygon points="50,56 36,42 64,42" fill="#ffffff" />
            {/* Big Ears */}
            <polygon points="32,34 22,8 44,22" fill="#ea580c" />
            <polygon points="32,30 26,14 40,22" fill="#18181b" />
            <polygon points="68,34 78,8 56,22" fill="#ea580c" />
            <polygon points="68,30 74,14 60,22" fill="#18181b" />
            {/* Eyes */}
            <ellipse cx="42" cy="38" rx="3.5" ry="4.5" fill="#0f172a" />
            <circle cx="43" cy="36.5" r="1.2" fill="#ffffff" />
            <ellipse cx="58" cy="38" rx="3.5" ry="4.5" fill="#0f172a" />
            <circle cx="59" cy="36.5" r="1.2" fill="#ffffff" />
            {/* Nose */}
            <circle cx="50" cy="52" r="2.5" fill="#0f172a" />
          </g>
        )}

        {/* 🐲 DRAGON / QUANTUM DRAKE */}
        {species === 'dragon' && (
          <g id="species-dragon">
            {/* Wings */}
            <polygon points="50,50 14,24 28,52" fill="#b91c1c" />
            <polygon points="50,50 86,24 72,52" fill="#b91c1c" />
            {/* Body */}
            <ellipse cx="50" cy="64" rx="24" ry="22" fill="#ef4444" />
            <ellipse cx="50" cy="66" rx="14" ry="16" fill="#fecaca" />
            {/* Head */}
            <circle cx="50" cy="38" r="20" fill="#ef4444" />
            {/* Horns */}
            <path d="M38 24 Q30 10 20 14 Q32 20 36 28" fill="#ffd700" />
            <path d="M62 24 Q70 10 80 14 Q68 20 64 28" fill="#ffd700" />
            {/* Snout */}
            <rect x="42" y="40" width="16" height="12" rx="6" fill="#dc2626" />
            <circle cx="46" cy="44" r="1.5" fill="#450a0a" />
            <circle cx="54" cy="44" r="1.5" fill="#450a0a" />
            {/* Fierce Eyes */}
            <polygon points="38,32 46,36 38,38" fill="#ffd700" />
            <polygon points="62,32 54,36 62,38" fill="#ffd700" />
          </g>
        )}

        {/* 🤖 ROBOT / MECH BOT */}
        {species === 'robot' && (
          <g id="species-robot">
            {/* Antenna */}
            <line x1="50" y1="20" x2="50" y2="8" stroke="#0ea5e9" strokeWidth="3" />
            <circle cx="50" cy="8" r="3.5" fill="#38bdf8" />
            {/* Head */}
            <rect x="30" y="20" width="40" height="32" rx="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            {/* Visor Screen */}
            <rect x="36" y="28" width="28" height="14" rx="4" fill="#0f172a" />
            <circle cx="44" cy="35" r="3" fill="#00f0ff" />
            <circle cx="56" cy="35" r="3" fill="#00f0ff" />
            {/* Body */}
            <rect x="34" y="56" width="32" height="24" rx="8" fill="#0369a1" />
            <circle cx="50" cy="68" r="4.5" fill="#38bdf8" />
            {/* Arms */}
            <rect x="24" y="60" width="8" height="16" rx="4" fill="#0284c7" />
            <rect x="68" y="60" width="8" height="16" rx="4" fill="#0284c7" />
            {/* Thruster Flame */}
            <polygon points="44,80 56,80 50,92" fill="#00f0ff" opacity="0.8" />
          </g>
        )}

        {/* 🐰 BUNNY / HOLO BUNNY */}
        {species === 'bunny' && (
          <g id="species-bunny">
            {/* Big Ears */}
            <ellipse cx="38" cy="18" rx="7" ry="16" fill="#f472b6" />
            <ellipse cx="38" cy="18" rx="4" ry="12" fill="#fdf2f8" />
            <ellipse cx="62" cy="18" rx="7" ry="16" fill="#f472b6" />
            <ellipse cx="62" cy="18" rx="4" ry="12" fill="#fdf2f8" />
            {/* Body */}
            <ellipse cx="50" cy="64" rx="24" ry="20" fill="#ec4899" />
            {/* Head */}
            <circle cx="50" cy="42" r="20" fill="#f472b6" />
            {/* Eyes */}
            <circle cx="42" cy="40" r="3.5" fill="#831843" />
            <circle cx="43" cy="39" r="1.2" fill="#ffffff" />
            <circle cx="58" cy="40" r="3.5" fill="#831843" />
            <circle cx="59" cy="39" r="1.2" fill="#ffffff" />
            {/* Nose */}
            <polygon points="50,47 48,44 52,44" fill="#ffffff" />
            {/* Cheeks */}
            <circle cx="36" cy="46" r="3" fill="#fbcfe8" opacity="0.8" />
            <circle cx="64" cy="46" r="3" fill="#fbcfe8" opacity="0.8" />
          </g>
        )}

        {/* 🦉 OWL / ATHENA OWL */}
        {species === 'owl' && (
          <g id="species-owl">
            {/* Body */}
            <ellipse cx="50" cy="58" rx="26" ry="26" fill="#7e22ce" />
            {/* Belly feathers */}
            <path d="M42 58 Q50 64 58 58 M42 66 Q50 72 58 66" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Tuft Ears */}
            <polygon points="32,32 24,14 42,24" fill="#6b21a8" />
            <polygon points="68,32 76,14 58,24" fill="#6b21a8" />
            {/* Big Glasses/Eyes */}
            <circle cx="38" cy="40" r="10" fill="#a855f7" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="38" cy="40" r="4.5" fill="#0f172a" />
            <circle cx="39.5" cy="38.5" r="1.5" fill="#ffffff" />
            <circle cx="62" cy="40" r="10" fill="#a855f7" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="62" cy="40" r="4.5" fill="#0f172a" />
            <circle cx="63.5" cy="38.5" r="1.5" fill="#ffffff" />
            {/* Beak */}
            <polygon points="50,45 46,40 54,40" fill="#f59e0b" />
          </g>
        )}

        {/* 🐶 DOG / CYBER SHIBA */}
        {species === 'dog' && (
          <g id="species-dog">
            {/* Body */}
            <ellipse cx="50" cy="62" rx="26" ry="22" fill="#ca8a04" />
            {/* Belly */}
            <ellipse cx="50" cy="65" rx="15" ry="14" fill="#fef08a" />
            {/* Tail */}
            <path d="M74 66 C86 54 86 42 76 46" stroke="#ca8a04" strokeWidth="6" strokeLinecap="round" fill="none" />
            {/* Head */}
            <circle cx="50" cy="38" r="22" fill="#eab308" />
            {/* Ears */}
            <polygon points="32,26 24,12 40,18" fill="#ca8a04" />
            <polygon points="68,26 76,12 60,18" fill="#ca8a04" />
            {/* Muzzle */}
            <ellipse cx="50" cy="45" rx="9" ry="7" fill="#fef08a" />
            <circle cx="50" cy="42" r="3" fill="#0f172a" />
            <path d="M48 45 Q50 48 52 45" stroke="#0f172a" strokeWidth="1.5" fill="none" />
            {/* Eyes */}
            <circle cx="40" cy="36" r="3.5" fill="#0f172a" />
            <circle cx="41" cy="35" r="1.2" fill="#ffffff" />
            <circle cx="60" cy="36" r="3.5" fill="#0f172a" />
            <circle cx="61" cy="35" r="1.2" fill="#ffffff" />
          </g>
        )}

        {/* ── PET ACCESSORIES ──────────────────────────────────────── */}
        {petHatId && (
          <g id="pet-accessories-layer">
            {/* Bowtie */}
            {petHatId === 'pet-bowtie' && (
              <g id="acc-pet-bowtie">
                <polygon points="42,54 50,56 42,58" fill="#ec4899" />
                <polygon points="58,54 50,56 58,58" fill="#ec4899" />
                <circle cx="50" cy="56" r="2.5" fill="#f43f5e" />
              </g>
            )}

            {/* Scouter HUD */}
            {petHatId === 'pet-mini-scouter' && (
              <g id="acc-pet-scouter">
                <rect x="36" y="32" width="16" height="8" rx="2" fill="#06b6d4" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
                <line x1="36" y1="36" x2="26" y2="34" stroke="#0284c7" strokeWidth="1.5" />
              </g>
            )}

            {/* Mini Crown */}
            {petHatId === 'pet-mini-crown' && (
              <g id="acc-pet-crown">
                <polygon points="42,18 46,10 50,15 54,10 58,18" fill="#ffd700" stroke="#b45309" strokeWidth="0.8" />
                <circle cx="46" cy="12" r="1" fill="#ec4899" />
                <circle cx="54" cy="12" r="1" fill="#38bdf8" />
                <rect x="42" y="17" width="16" height="2" fill="#d97706" />
              </g>
            )}

            {/* Angel Halo */}
            {petHatId === 'pet-angel-halo' && (
              <g id="acc-pet-halo">
                <ellipse cx="50" cy="12" rx="18" ry="4.5" stroke="#38bdf8" strokeWidth="2.5" fill="none" filter="url(#pet-glow)" />
                <circle cx="36" cy="12" r="1.5" fill="#ffffff" />
                <circle cx="64" cy="12" r="1.5" fill="#ffffff" />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
