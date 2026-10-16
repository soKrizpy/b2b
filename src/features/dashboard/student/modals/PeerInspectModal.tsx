'use client';
// src/features/dashboard/student/modals/PeerInspectModal.tsx
// Read-only profile card shown when a student clicks a classmate's seat.
// Displays: avatar emoji, name, equipped accessory, level & XP progress.

import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { getAccessoryById } from '@/features/pet/lib/avatarShopCatalog';
import type { TownSquareSeat } from '@/features/sessions/queries';

interface Props {
  seat:    TownSquareSeat;
  onClose: () => void;
}

const PET_EMOJI: Record<string, string> = {
  cat: '🐱', dog: '🐶', fox: '🦊', bunny: '🐰',
  bear: '🐻', owl: '🦉', dragon: '🐲', robot: '🤖',
};

export function PeerInspectModal({ seat, onClose }: Props) {
  const lvl       = calculateLevel(seat.total_xp);
  const accessory = getAccessoryById(seat.equipped_hat_id);
  const petEmoji  = seat.avatar_id ? (PET_EMOJI[seat.avatar_id] ?? '🐾') : '🐾';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
        bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#0B0F19] border border-blue-400/40 dark:border-purple-500/40
          rounded-2xl shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 dark:from-indigo-950 dark:via-purple-950 dark:to-zinc-900
          rounded-xl p-5 text-white text-center relative border border-blue-400/30 dark:border-purple-500/30">
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-7 h-7 rounded-xl
              bg-white/10 hover:bg-white/20 flex items-center justify-center
              text-white/80 font-bold text-sm transition-colors"
          >
            ✕
          </button>

          {/* Avatar */}
          <div className="w-18 h-18 mx-auto rounded-2xl
            bg-gradient-to-br from-blue-700 to-indigo-800 dark:from-zinc-800 dark:to-purple-950
            flex items-center justify-center text-4xl mb-3
            ring-2 ring-blue-300/50 dark:ring-purple-400/50 shadow-xl">
            {petEmoji}
          </div>

          <h2 className="text-base font-extrabold tracking-tight text-white">{seat.full_name}</h2>

          {/* Level chip */}
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold
            bg-white/20 text-blue-100 dark:bg-purple-500/20 dark:text-purple-300 border border-white/30 dark:border-purple-500/30 px-3 py-1 rounded-full">
            ⭐ Level {lvl.currentLevel}
          </span>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4">

          {/* XP progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-500 dark:text-zinc-400">
                EXP Progress
              </span>
              <span className="font-extrabold text-blue-600 dark:text-purple-400 tabular-nums">
                {lvl.xpInCurrentLevel}/{lvl.xpNeededThisLevel} XP
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-cyan-500 dark:to-purple-500
                  transition-all duration-700"
                style={{ width: `${lvl.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Equipped accessory */}
          <div className="rounded-xl bg-slate-50 dark:bg-zinc-950/60
            border border-blue-200/70 dark:border-zinc-800 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider
              text-slate-400 dark:text-zinc-500 mb-1.5">
              Aksesori Aktif
            </p>
            {accessory ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${accessory.accentColor}22`, border: `1.5px solid ${accessory.accentColor}55` }}
                >
                  {accessory.category === 'hat'     ? '🎩' :
                   accessory.category === 'hood'    ? '🧙' :
                   accessory.category === 'headset' ? '🎧' :
                   accessory.category === 'visor'   ? '🥽' : '👑'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {accessory.name}
                  </p>
                  {accessory.badge && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: `${accessory.accentColor}33`, color: accessory.accentColor }}
                    >
                      {accessory.badge}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-zinc-500 italic">
                Tidak ada aksesori yang dipakai
              </p>
            )}
          </div>

          {/* Total XP chip */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl
            bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Total XP
            </span>
            <span className="text-sm font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
              ⭐ {seat.total_xp.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold
              border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 bg-slate-100
              hover:bg-slate-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
