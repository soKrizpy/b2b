'use client';
// src/app/student/lessons/QuestMapClient.tsx
// Fantasy Island Expedition Quest Map for Bits2Bytes LMS with Fog of War.
// Nodes act as interactive clickable fantasy locations (Villages, Caves, Temples, Forests, Citadels, etc.)
// shrouded in an authentic RPG Fog of War using CSS masking and semi-transparent gradients.
// Surrounding nodes are progressively revealed as students complete adjacent topics.

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuizModal } from '@/features/quiz/components/QuizModal';
import { LevelUpCelebrationModal } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { TIER_CONFIG } from '@/features/certificates/queries';
import { getFantasyLocationForTopic, type FantasyLocation } from '@/features/quiz/fantasyIsland';
import type { QuestMapData, QuestTopicNode, NodeStatus } from '@/features/quiz/questMapQueries';
import type { QuizQuestion } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow } from '@/types/database';
import {
  Tent,
  Mountain,
  Landmark,
  Trees,
  TowerControl,
  Flame,
  Castle,
  Sparkles,
  Crown,
  Compass,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  Footprints,
  Trophy,
  MapPin,
  CloudFog,
  Eye,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FogState = 'cleared' | 'revealed' | 'scouted' | 'shrouded';

interface Props {
  questData:  QuestMapData;
  cert:       { tier: string; score: number; certificate_number: string } | null;
  studentId:  string;
}

type PopoverAnchor = { nodeId: number; isFinal?: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; badge: string }> = {
  COMPLETED:   { label: 'Lokasi Ditaklukkan',   badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  NEEDS_QUIZ:  { label: 'Ujian Rune Terbuka!',  badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40'       },
  ACTIVE_NEXT: { label: 'Siap Dijelajahi',      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'          },
  LOCKED:      { label: 'Tertutup Kabut Perang', badge: 'bg-slate-800 text-slate-400 border-slate-700/60'          },
};

// ── Biome Icon Renderer ───────────────────────────────────────────────────────

function BiomeIcon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  switch (name) {
    case 'Tent':         return <Tent className={className} />;
    case 'Mountain':     return <Mountain className={className} />;
    case 'Landmark':     return <Landmark className={className} />;
    case 'Trees':        return <Trees className={className} />;
    case 'TowerControl': return <TowerControl className={className} />;
    case 'Flame':        return <Flame className={className} />;
    case 'Castle':       return <Castle className={className} />;
    case 'Crown':        return <Crown className={className} />;
    default:             return <Sparkles className={className} />;
  }
}

// ── Mini Star Display ─────────────────────────────────────────────────────────

function LocationStars({ count, status, isShrouded }: { count: 0 | 1 | 2 | 3; status: NodeStatus; isShrouded?: boolean }) {
  if (isShrouded) {
    return (
      <div className="flex gap-1 mt-1 justify-center select-none opacity-40" aria-hidden="true">
        <span className="text-[10px] text-slate-600">?</span>
        <span className="text-[10px] text-slate-600">?</span>
        <span className="text-[10px] text-slate-600">?</span>
      </div>
    );
  }

  const effectiveCount: 0 | 1 | 2 | 3 =
    status === 'COMPLETED' && count === 0 ? 3 : count;

  return (
    <div className="flex gap-1 mt-1 justify-center select-none" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`text-[11px] transition-all ${
            n <= effectiveCount
              ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]'
              : 'text-slate-700 dark:text-zinc-700'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Fantasy Island Location Node with Fog of War ──────────────────────────────

function FantasyIslandNode({
  node,
  index,
  isFinal = false,
  fogState,
  isActive,
  onEnter,
  onClick,
}: {
  node:           QuestTopicNode | null;
  index:          number;
  isFinal?:       boolean;
  fogState:       FogState;
  isActive:       boolean;
  onEnter:        () => void;
  onClick:        () => void;
}) {
  const status: NodeStatus | 'FINAL' = isFinal
    ? (node ? node.status : 'ACTIVE_NEXT')
    : (node ? node.status : 'LOCKED');

  const loc: FantasyLocation = getFantasyLocationForTopic(
    node?.topic.title ?? 'Ujian Akhir',
    index,
    isFinal
  );

  const isCompleted = status === 'COMPLETED';
  const isNeedsQuiz = status === 'NEEDS_QUIZ';
  const isActiveNext = status === 'ACTIVE_NEXT';

  const isShrouded = fogState === 'shrouded';
  const isScouted = fogState === 'scouted';
  const isCleared = fogState === 'cleared' || isCompleted;

  // Mask styles using CSS masking for soft blending fog edges
  const maskStyle = isShrouded
    ? {
        WebkitMaskImage: 'radial-gradient(ellipse 88% 88% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.1) 100%)',
        maskImage: 'radial-gradient(ellipse 88% 88% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.1) 100%)',
      }
    : isScouted
    ? {
        WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0.7) 85%, rgba(0,0,0,0.2) 100%)',
        maskImage: 'radial-gradient(ellipse 95% 95% at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0.7) 85%, rgba(0,0,0,0.2) 100%)',
      }
    : undefined;

  return (
    <div className="relative flex flex-col items-center group/island py-2">
      {/* Ambient Fog Halo for shrouded/scouted locations */}
      {isShrouded && (
        <div
          aria-hidden="true"
          className="absolute -inset-4 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700/35 via-slate-900/50 to-transparent blur-md pointer-events-none animate-fog-glow z-0"
        />
      )}

      {isScouted && (
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-cyan-950/30 to-transparent blur-sm pointer-events-none animate-fog-wisp z-0"
        />
      )}

      {/* 3D Island Base Button with CSS Masking */}
      <button
        type="button"
        style={maskStyle}
        onMouseEnter={onEnter}
        onClick={onClick}
        aria-label={`${isShrouded ? 'Wilayah Berkabut' : loc.name}: ${isFinal ? 'Ujian Akhir' : STATUS_CONFIG[status as NodeStatus]?.label || 'Lokasi'}`}
        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1.5 transition-all duration-300
          flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden
          ${isActive ? 'scale-110 ring-4 ring-cyan-400 ring-offset-4 ring-offset-slate-950 z-30' : 'hover:scale-105 z-10'}
          ${isCleared
            ? 'bg-gradient-to-b from-emerald-900/90 via-teal-950 to-slate-950 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30'
            : isNeedsQuiz
            ? 'bg-gradient-to-b from-amber-900/90 via-orange-950 to-slate-950 border-2 border-amber-400 ring-4 ring-amber-400/50 shadow-xl shadow-amber-500/40 animate-pulse'
            : isActiveNext
            ? 'bg-gradient-to-b from-cyan-900/90 via-slate-900 to-slate-950 border-2 border-cyan-400 shadow-xl shadow-cyan-500/35 ring-2 ring-cyan-400/40'
            : isFinal && !isShrouded
            ? 'bg-gradient-to-b from-amber-800 via-yellow-950 to-slate-950 border-2 border-yellow-300 shadow-2xl shadow-amber-500/50 ring-4 ring-amber-400/40'
            : isScouted
            ? 'bg-gradient-to-b from-indigo-950/80 via-slate-900/90 to-slate-950 border border-indigo-400/50 shadow-lg shadow-indigo-950/60 hover:border-cyan-400/70'
            : 'bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border border-slate-700/60 opacity-80 hover:opacity-95'
          }`}
      >
        {/* Glowing terrain surface rune ring */}
        <div className="absolute inset-1 rounded-[20px] bg-slate-950/40 pointer-events-none" />

        {/* ── Fog of War Semi-Transparent Gradient Overlays ── */}
        {isShrouded && (
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-slate-950/95 via-slate-800/85 to-slate-950/95 backdrop-blur-[3px] border border-slate-700/60 z-20 flex flex-col items-center justify-center overflow-hidden"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0.6) 85%, rgba(0,0,0,0.2) 100%)',
              maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0.6) 85%, rgba(0,0,0,0.2) 100%)',
            }}
          >
            {/* Drifting mist wisp */}
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400/25 via-slate-700/30 to-transparent animate-fog-wisp pointer-events-none"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.25))',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.25))',
              }}
            />
            <CloudFog className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 animate-pulse drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]" />
            <span className="text-[7.5px] font-black uppercase tracking-tighter text-slate-400/90 font-mono mt-0.5">
              KABUT
            </span>
          </div>
        )}

        {isScouted && (
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-slate-950/70 via-indigo-950/50 to-slate-900/65 pointer-events-none z-20 flex flex-col items-center justify-center overflow-hidden"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%)',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent opacity-60 animate-fog-wisp pointer-events-none" />
            <div className="absolute top-1.5 right-1.5">
              <Eye className="w-3 h-3 text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
            </div>
          </div>
        )}

        {/* Central Biome Icon & Realm Symbol */}
        <div
          className={`relative z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center
            shadow-inner transition-transform group-hover/island:scale-110
            ${isShrouded ? 'opacity-25 grayscale' : isScouted ? 'opacity-70 saturate-75' : loc.theme.landmarkIconBg}`}
        >
          {isFinal ? (
            <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <BiomeIcon name={loc.lucideIcon} className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </div>

        {/* Top Floating Badge (Tuntas / Kuis / Buka / Menipis / Terkabut / Final) */}
        <div className="absolute -top-2.5 z-30">
          {isCleared && (
            <span className="flex items-center gap-1 bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md font-mono">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>TUNTAS</span>
            </span>
          )}

          {isNeedsQuiz && (
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/50 animate-bounce font-mono">
              <Flame className="w-2.5 h-2.5 text-slate-950" />
              <span>KUIS!</span>
            </span>
          )}

          {isActiveNext && (
            <span className="flex items-center gap-1 bg-cyan-400 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md font-mono">
              <Compass className="w-2.5 h-2.5" />
              <span>BUKA</span>
            </span>
          )}

          {isScouted && !isNeedsQuiz && !isActiveNext && (
            <span className="flex items-center gap-1 bg-indigo-950/90 text-cyan-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/50 shadow-md font-mono">
              <Eye className="w-2.5 h-2.5 text-cyan-300" />
              <span>MENIPIS</span>
            </span>
          )}

          {isShrouded && (
            <span className="flex items-center gap-1 bg-slate-900/95 text-slate-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700/80 shadow-md font-mono">
              <CloudFog className="w-2.5 h-2.5 text-slate-400" />
              <span>TERKABUT</span>
            </span>
          )}

          {isFinal && !isShrouded && !isCleared && (
            <span className="flex items-center gap-1 bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md font-mono">
              <Trophy className="w-2.5 h-2.5" />
              <span>FINAL</span>
            </span>
          )}
        </div>

        {/* Floating Order / Realm Tag at Bottom */}
        <div className="absolute -bottom-2 z-10">
          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-slate-300 shadow-sm">
            #{index + 1}
          </span>
        </div>
      </button>

      {/* Floating Island Plinth Shadow */}
      <div
        aria-hidden="true"
        className={`w-14 sm:w-18 h-3 rounded-full blur-xs mt-1 transition-colors ${
          isShrouded ? 'bg-slate-950/80' : isScouted ? 'bg-indigo-950/50' : 'bg-cyan-950/40 dark:bg-black/60'
        }`}
      />

      {/* Location Name & Biome Subtitle */}
      <div className="mt-1 text-center max-w-[110px] sm:max-w-[130px]">
        {isShrouded ? (
          <>
            <p className="text-[11px] font-extrabold text-slate-400 truncate leading-tight flex items-center justify-center gap-1">
              <span>🌫️</span>
              <span>Wilayah #{index + 1}</span>
            </p>
            <p className="text-[9px] font-bold text-slate-500 truncate mt-0.5">
              Tertutup Kabut Perang
            </p>
            {node && <LocationStars count={node.stars} status={node.status} isShrouded />}
          </>
        ) : isScouted ? (
          <>
            <p className="text-[11px] font-extrabold text-cyan-200 truncate leading-tight flex items-center justify-center gap-1">
              <span>👀</span>
              <span>{loc.name.split('·')[0].trim()}</span>
            </p>
            <p className="text-[9px] font-bold text-indigo-300 truncate mt-0.5">
              {loc.biomeName} (Terpantau)
            </p>
            {node && <LocationStars count={node.stars} status={node.status} />}
          </>
        ) : (
          <>
            <p className="text-[11px] font-extrabold text-slate-200 truncate leading-tight">
              {loc.emoji} {loc.name.split('·')[0].trim()}
            </p>
            <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">
              {loc.biomeName}
            </p>
            {node && <LocationStars count={node.stars} status={node.status} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Location Dossier Popover Card with Fog of War Handling ────────────────────

function LocationPopoverCard({
  node,
  index,
  isFinal,
  fogState,
  prevNodeTitle,
  activeNodeTitle,
  moduleId,
  isModuleComplete,
  cert,
  onQuizClick,
  onFocusActiveNode,
  onClose,
}: {
  node:              QuestTopicNode | null;
  index:             number;
  isFinal:           boolean;
  fogState:          FogState;
  prevNodeTitle?:    string;
  activeNodeTitle?:  string;
  moduleId:          number;
  isModuleComplete:  boolean;
  cert:              { tier: string; score: number; certificate_number: string } | null;
  onQuizClick:       () => void;
  onFocusActiveNode: () => void;
  onClose:           () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const loc: FantasyLocation = getFantasyLocationForTopic(
    node?.topic.title ?? 'Ujian Akhir',
    index,
    isFinal
  );

  const cardCls = `absolute z-50 bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2
    w-72 sm:w-84 rounded-3xl
    bg-slate-950/98 border border-slate-700/80 backdrop-blur-xl
    shadow-2xl shadow-cyan-950/80 p-5 flex flex-col gap-3 text-left
    animate-in fade-in zoom-in-95 duration-150 origin-bottom text-white`;

  const Caret = () => (
    <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4
      bg-slate-950 border-b border-r border-slate-700/80 rotate-45" />
  );

  // ── Final Boss Citadel Dossier ──
  if (isFinal) {
    return (
      <div ref={ref} className={cardCls}>
        <Caret />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Crown className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono">
              Puncak Tertinggi Modul
            </span>
            <h4 className="text-sm font-black text-white truncate">
              {loc.name}
            </h4>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {loc.lore}
        </p>

        {cert ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>{TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].medal}</span>
              <span>{TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].label} — Nilai {cert.score}</span>
            </p>
            <p className="text-[10px] text-amber-400/80 mt-1 font-mono">
              No. Sertifikat: {cert.certificate_number}
            </p>
          </div>
        ) : isModuleComplete ? (
          <Link
            href={`/student/assessment/${moduleId}`}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl
              text-xs font-black text-slate-950
              bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
              hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/30
              hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Tantang Ujian Akhir Modul!</span>
          </Link>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Selesaikan seluruh waypoint ekspedisi di bawah untuk membuka gerbang istana akhir.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!node) return null;

  // ── Shrouded in Deep Fog of War Dossier ──
  if (fogState === 'shrouded') {
    return (
      <div ref={ref} className={cardCls}>
        <Caret />
        <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
            <CloudFog className="w-5 h-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <Lock className="w-2.5 h-2.5" />
              <span>KABUT PERANG (FOG OF WAR)</span>
            </span>
            <h4 className="text-xs font-extrabold text-slate-300 truncate mt-1">
              Wilayah Belum Terpetakan #{index + 1}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Wilayah kepulauan ini masih diselimuti kabut tebal kuno. Kompas petualangan belum dapat menjangkau koordinat ini.
          </p>
          <div className="pt-1 border-t border-slate-800/80 text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>
              Selesaikan <strong className="text-white">{prevNodeTitle || `Lokasi #${index}`}</strong> untuk menyingkap kabut!
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onFocusActiveNode();
            onClose();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400
            hover:from-cyan-300 hover:to-blue-300 shadow-md shadow-cyan-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Lompat ke Misi Aktif ({activeNodeTitle || 'Misi'})</span>
        </button>
      </div>
    );
  }

  // ── Scouted / Peripheral Mist Dossier ──
  if (fogState === 'scouted') {
    return (
      <div ref={ref} className={cardCls}>
        <Caret />
        <div className="flex items-center gap-3 pb-2 border-b border-indigo-900/60">
          <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
            <Eye className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-indigo-950 border border-indigo-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <Eye className="w-2.5 h-2.5" />
              <span>KABUT MENIPIS · WILAYAH TERDEKAT</span>
            </span>
            <h4 className="text-xs font-black text-white truncate mt-1">
              {node.topic.title}
            </h4>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{loc.biomeName}</span>
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {loc.lore}
          </p>
        </div>

        <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-2.5 text-[11px] text-indigo-200">
          <span className="font-semibold text-white">Syarat Pembukaan: </span>
          Tuntaskan tantangan di <strong className="text-cyan-300">{prevNodeTitle || `Lokasi #${index}`}</strong> untuk membubarkan kabut sepenuhnya.
        </div>

        <button
          type="button"
          onClick={() => {
            onFocusActiveNode();
            onClose();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-cyan-400 to-indigo-400
            hover:from-cyan-300 hover:to-indigo-300 shadow-md shadow-cyan-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Fokuskan ke Misi Aktif ({activeNodeTitle || 'Misi'})</span>
        </button>
      </div>
    );
  }

  // ── Cleared / Revealed Standard Dossier ──
  const cfg = STATUS_CONFIG[node.status];
  const description = (node.topic.description ?? '').slice(0, 110) || loc.lore;

  return (
    <div ref={ref} className={cardCls}>
      <Caret />

      {/* Header with Biome Icon */}
      <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${loc.theme.landmarkIconBg}`}>
            <BiomeIcon name={loc.lucideIcon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block ${cfg.badge}`}>
              {cfg.label}
            </span>
            <p className="text-xs font-black text-white truncate mt-0.5">
              {node.topic.title}
            </p>
          </div>
        </div>

        {node.status === 'COMPLETED' && node.bestScore > 0 && (
          <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
            {node.bestScore}%
          </span>
        )}
      </div>

      {/* Lore & Topic Description */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-amber-400/90 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{loc.biomeName}</span>
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Challenges & Stars Details */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1 font-medium">
          {node.topic.challenge_count > 0 ? (
            <span>{node.topic.challenge_count} Tantangan Belajar</span>
          ) : (
            <span>Materi Interaktif</span>
          )}
        </div>

        {node.status === 'COMPLETED' && (
          <div className="flex gap-0.5 text-amber-400 text-xs">
            <span>★</span><span>★</span><span>★</span>
          </div>
        )}
      </div>

      {/* Direct Action Buttons */}
      {node.status === 'NEEDS_QUIZ' && (
        <button
          type="button"
          onClick={() => { onQuizClick(); onClose(); }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
            hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{node.attemptsUsed === 1 ? 'Ulangi Ujian Rune' : 'Mulai Ujian Rune di Lokasi!'}</span>
        </button>
      )}

      {node.status === 'ACTIVE_NEXT' && (
        <Link
          href={`/student/lessons/topic/${node.topic.id}`}
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400
            hover:from-cyan-300 hover:to-blue-300 shadow-md shadow-cyan-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Jelajahi Lokasi &amp; Pelajari Materi</span>
        </Link>
      )}

      {node.status === 'COMPLETED' && (
        <Link
          href={`/student/lessons/topic/${node.topic.id}`}
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-2xl
            text-xs font-bold text-slate-200
            bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Jelajahi Kembali Materi</span>
        </Link>
      )}
    </div>
  );
}

// ── QuestMapClient Root Component ─────────────────────────────────────────────

export function QuestMapClient({ questData, cert }: Props) {
  const router = useRouter();

  const [quizNode, setQuizNode]       = useState<QuestTopicNode | null>(null);
  const [popover, setPopover]         = useState<PopoverAnchor | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [chunkSize, setChunkSize]     = useState(3);

  useEffect(() => {
    const update = () => setChunkSize(window.innerWidth >= 1024 ? 4 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { mod, nodes, moduleComplete, hasFinal } = questData;

  // Deduplicate nodes by topic id
  const uniqueNodes = Array.from(
    new Map(nodes.map((n) => [n.topic.id, n])).values()
  );

  // Compute completed streak & frontier
  let highestCompletedIdx = -1;
  for (let i = 0; i < uniqueNodes.length; i++) {
    if (uniqueNodes[i].status === 'COMPLETED') {
      highestCompletedIdx = i;
    }
  }

  // Active frontier node (the one the student is currently working on)
  const activeNode = uniqueNodes.find(
    (n) => n.status === 'NEEDS_QUIZ' || n.status === 'ACTIVE_NEXT'
  ) ?? uniqueNodes[0];

  // Helper to determine fog state for any node index
  const getFogState = useCallback((index: number, isFinalNode = false): FogState => {
    if (isFinalNode) {
      if (moduleComplete) return cert ? 'cleared' : 'revealed';
      if (highestCompletedIdx >= uniqueNodes.length - 2) return 'scouted';
      return 'shrouded';
    }

    const n = uniqueNodes[index];
    if (!n) return 'shrouded';

    if (n.status === 'COMPLETED') return 'cleared';
    if (n.status === 'ACTIVE_NEXT' || n.status === 'NEEDS_QUIZ') return 'revealed';

    // For locked nodes: if it's within 1 step of the completed streak or active frontier
    if (index <= highestCompletedIdx + 2) {
      return 'scouted';
    }

    return 'shrouded';
  }, [uniqueNodes, moduleComplete, cert, highestCompletedIdx]);

  const completedCount = uniqueNodes.filter((n) => n.status === 'COMPLETED').length;
  const clearedOrRevealedCount = uniqueNodes.filter((_, idx) => {
    const state = getFogState(idx);
    return state === 'cleared' || state === 'revealed';
  }).length + (hasFinal && (moduleComplete) ? 1 : 0);

  const totalLocations = uniqueNodes.length + (hasFinal ? 1 : 0);
  const totalStarsEarned = uniqueNodes.reduce((acc, curr) => acc + (curr.status === 'COMPLETED' ? (curr.stars || 3) : 0), 0);
  const explorationPct = Math.round((completedCount / (uniqueNodes.length || 1)) * 100);
  const fogClearedPct = Math.round((clearedOrRevealedCount / (totalLocations || 1)) * 100);

  const rows = chunk(uniqueNodes, chunkSize);

  const handleQuizComplete = useCallback(() => {
    setQuizNode(null);
    setPopover(null);
    setShowCelebration(true);
    router.refresh();
  }, [router]);

  const openQuiz = useCallback((node: QuestTopicNode) => {
    setQuizNode(node);
    setPopover(null);
  }, []);

  const FINAL_ID = -1;

  if (mod.topics.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 italic py-12
        bg-slate-900/40 rounded-3xl border border-slate-800 mx-4">
        Belum ada kepulauan atau topik yang dipublikasikan untuk modul ini.
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden
      bg-gradient-to-b from-slate-950 via-[#0a1426] to-[#070d18]
      border border-cyan-500/30 shadow-2xl p-5 sm:p-8 space-y-8 text-white">

      {/* ── Ambient Fog of War Cloud Canvas (CSS Masking & Semi-Transparent Gradients) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

        {/* Dynamic rolling fog layers using CSS masks and semi-transparent gradients */}
        <div
          className="absolute -top-16 -right-16 w-96 h-96 bg-gradient-to-br from-slate-700/25 via-slate-800/35 to-transparent rounded-full blur-3xl animate-fog-slow"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          }}
        />
        <div
          className="absolute bottom-0 -left-16 w-96 h-96 bg-gradient-to-tr from-cyan-950/30 via-slate-900/40 to-transparent rounded-full blur-3xl animate-fog-slow"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-64 bg-slate-800/10 rounded-full blur-3xl animate-fog-wisp"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Fantasy Island Explorer Header ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 font-mono">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              KEPULAUAN KODE · REALM OF BITS2BYTES
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Peta Ekspedisi {mod.title}</span>
            <span className="text-xl">🏝️</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selesaikan tiap lokasi untuk menyingkap kabut perang (Fog of War) dan membuka jalur pulau berikutnya.
          </p>
        </div>

        {/* Expedition Metrics & Fog Gauge Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fog Cleared Gauge */}
          <div className="rounded-2xl bg-indigo-950/60 border border-indigo-500/40 px-3.5 py-2 flex items-center gap-2.5 shadow-md shadow-indigo-950/40">
            <CloudFog className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Tabir Kabut</p>
              <p className="text-xs font-black text-cyan-300 font-mono">
                {clearedOrRevealedCount}/{totalLocations} Bebas Kabut ({fogClearedPct}%)
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-cyan-950/50 border border-cyan-500/30 px-3.5 py-2 flex items-center gap-2.5">
            <Footprints className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Ditaklukkan</p>
              <p className="text-xs font-black text-cyan-300 font-mono">
                {completedCount}/{totalLocations} Lokasi ({explorationPct}%)
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 flex items-center gap-2.5">
            <span className="text-base">⭐</span>
            <div>
              <p className="text-[10px] text-amber-400/80 font-bold uppercase">Bintang</p>
              <p className="text-xs font-black text-amber-300 font-mono">
                {totalStarsEarned} ★ Diraih
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RPG Map Legend with Fog of War Indicators ── */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5 text-xs text-slate-400 flex-wrap pb-2 border-b border-slate-800 select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span className="font-medium text-slate-300">Lokasi Bebas Kabut</span>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.7)]" />
          <span className="font-medium text-cyan-300">Misi Aktif (Tersingkap)</span>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)]" />
          <span className="font-medium text-indigo-300">Wilayah Terdekat (Kabut Menipis)</span>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500" />
          <span className="font-medium text-slate-400">Tertutup Kabut Perang (Fog of War)</span>
        </span>
      </div>

      {/* ── Archipelago Island Path Rows ── */}
      <div className="relative z-10 w-full max-w-3xl mx-auto py-4 flex flex-col gap-12 sm:gap-14">
        {rows.map((row, rowIdx) => {
          const isReverse = rowIdx % 2 === 1;
          const isLastRow = rowIdx === rows.length - 1;
          const displayNodes = isReverse ? [...row].reverse() : row;
          const lastInRow = row[row.length - 1];

          return (
            <div key={`row-${rowIdx}`} className="flex items-center w-full gap-0 relative">
              {displayNodes.map((node, colIdx) => {
                const globalIdx = uniqueNodes.indexOf(node);
                const isPopoverOpen = popover?.nodeId === node.topic.id && !popover?.isFinal;
                const isLastInDisplay = colIdx === displayNodes.length - 1;

                const fogState = getFogState(globalIdx);
                const prevNodeTitle = globalIdx > 0 ? uniqueNodes[globalIdx - 1]?.topic.title : undefined;

                // Logical end of row drops vertically to next row / Final Boss
                const isLogicalEnd = node.topic.id === lastInRow.topic.id;
                const hasVerticalDrop = isLogicalEnd && (!isLastRow || hasFinal);
                const dropActive = node.status === 'COMPLETED';
                const nextRowFirstNode = !isLastRow ? rows[rowIdx + 1][0] : null;
                const nextRowIdx = nextRowFirstNode ? uniqueNodes.indexOf(nextRowFirstNode) : -1;
                const nextRowFog = nextRowIdx >= 0 ? getFogState(nextRowIdx) : 'shrouded';

                // Stepping stone pathway between adjacent nodes in display order
                const nextDisplayNode = displayNodes[colIdx + 1];
                let hConnActive = false;
                let hConnFog = false;

                if (nextDisplayNode) {
                  const leftNode = !isReverse ? node : nextDisplayNode;
                  const rightNode = !isReverse ? nextDisplayNode : node;

                  hConnActive = leftNode.status === 'COMPLETED';
                  const rightIdx = uniqueNodes.indexOf(rightNode);
                  const rightFog = getFogState(rightIdx);
                  hConnFog = rightFog === 'shrouded';
                }

                return (
                  <div key={node.topic.id} className="flex items-center flex-1 min-w-0">
                    {/* Fantasy Island Location Token */}
                    <div className="relative flex flex-col items-center flex-shrink-0 mx-auto">
                      <FantasyIslandNode
                        node={node}
                        index={globalIdx}
                        fogState={fogState}
                        isActive={isPopoverOpen}
                        onEnter={() => setPopover({ nodeId: node.topic.id })}
                        onClick={() =>
                          setPopover((prev) =>
                            prev?.nodeId === node.topic.id && !prev.isFinal
                              ? null
                              : { nodeId: node.topic.id }
                          )
                        }
                      />

                      {/* Straight vertical drop connector between island rows */}
                      {hasVerticalDrop && (
                        <div
                          style={{
                            WebkitMaskImage: nextRowFog === 'shrouded'
                              ? 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.15))'
                              : undefined,
                            maskImage: nextRowFog === 'shrouded'
                              ? 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.15))'
                              : undefined,
                          }}
                          className={`absolute top-[calc(100%-10px)] left-1/2 -translate-x-1/2 w-2 h-12 sm:h-14 z-0 pointer-events-none rounded-full transition-colors flex flex-col items-center justify-around py-1 ${
                            dropActive
                              ? 'bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                              : nextRowFog === 'scouted'
                              ? 'bg-gradient-to-b from-slate-700 via-indigo-900/60 to-slate-900 border border-indigo-500/30'
                              : 'bg-gradient-to-b from-slate-800 to-slate-950/40 border border-dashed border-slate-700/40'
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                        </div>
                      )}

                      {/* Location Dossier Popover Card */}
                      {isPopoverOpen && (
                        <LocationPopoverCard
                          node={node}
                          index={globalIdx}
                          isFinal={false}
                          fogState={fogState}
                          prevNodeTitle={prevNodeTitle}
                          activeNodeTitle={activeNode?.topic.title}
                          moduleId={mod.id}
                          isModuleComplete={moduleComplete}
                          cert={null}
                          onQuizClick={() => openQuiz(node)}
                          onFocusActiveNode={() => setPopover({ nodeId: activeNode.topic.id })}
                          onClose={() => setPopover(null)}
                        />
                      )}
                    </div>

                    {/* Cobblestone / Leyline stepping trail between islands with CSS Masking */}
                    {!isLastInDisplay && (
                      <div className="flex-1 flex items-center justify-center px-1">
                        <div
                          style={{
                            WebkitMaskImage: hConnFog
                              ? 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 100%)'
                              : undefined,
                            maskImage: hConnFog
                              ? 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 100%)'
                              : undefined,
                          }}
                          className={`h-2 flex-1 rounded-full transition-all flex items-center justify-evenly ${
                            hConnActive
                              ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                              : !hConnFog
                              ? 'bg-gradient-to-r from-slate-800 via-indigo-950/60 to-slate-900 border border-slate-700/60'
                              : 'bg-gradient-to-r from-slate-800/80 to-slate-950/20 border-t border-b border-dashed border-slate-700/40'
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* ── Final Boss Peak Citadel with Fog of War ── */}
        {hasFinal && (() => {
          const lastRow = rows[rows.length - 1];
          const lastRowIdx = rows.length - 1;
          const lastRowReverse = lastRowIdx % 2 === 1;
          const lastRowDisplayNodes = lastRowReverse ? [...lastRow].reverse() : lastRow;
          const lastTopicNode = uniqueNodes[uniqueNodes.length - 1];

          const targetColIdx = lastRowDisplayNodes.findIndex(
            (n) => n.topic.id === lastTopicNode.topic.id
          );

          const finalPopoverOpen = popover?.nodeId === FINAL_ID && popover?.isFinal;
          const finalFogState = getFogState(uniqueNodes.length, true);

          return (
            <div className="flex items-center w-full gap-0 pt-2">
              {lastRowDisplayNodes.map((_, colIdx) => {
                const isTarget = colIdx === targetColIdx;
                const isLast = colIdx === lastRowDisplayNodes.length - 1;

                if (!isTarget) {
                  return (
                    <div key={`final-spacer-${colIdx}`} className="flex items-center flex-1 min-w-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 invisible flex-shrink-0 mx-auto" />
                      {!isLast && <div className="h-2 flex-1 opacity-0" />}
                    </div>
                  );
                }

                return (
                  <div key="final-boss-cell" className="flex items-center flex-1 min-w-0">
                    <div className="relative flex flex-col items-center flex-shrink-0 mx-auto">
                      <FantasyIslandNode
                        node={null}
                        index={uniqueNodes.length}
                        isFinal
                        fogState={finalFogState}
                        isActive={!!finalPopoverOpen}
                        onEnter={() => setPopover({ nodeId: FINAL_ID, isFinal: true })}
                        onClick={() =>
                          setPopover((prev) =>
                            prev?.nodeId === FINAL_ID ? null : { nodeId: FINAL_ID, isFinal: true }
                          )
                        }
                      />

                      {finalPopoverOpen && (
                        <LocationPopoverCard
                          node={null}
                          index={uniqueNodes.length}
                          isFinal
                          fogState={finalFogState}
                          prevNodeTitle={lastTopicNode?.topic.title}
                          activeNodeTitle={activeNode?.topic.title}
                          moduleId={mod.id}
                          isModuleComplete={moduleComplete}
                          cert={cert}
                          onQuizClick={() => {}}
                          onFocusActiveNode={() => setPopover({ nodeId: activeNode.topic.id })}
                          onClose={() => setPopover(null)}
                        />
                      )}
                    </div>
                    {!isLast && <div className="h-2 flex-1 opacity-0" />}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── Quiz Modal Trigger ── */}
      {quizNode && (
        <QuizModal
          topicId={quizNode.topic.id}
          topicTitle={quizNode.topic.title}
          questions={
            Array.isArray(
              (quizNode.topic.lesson_content as Record<string, unknown> | null)?.quiz
            )
              ? ((quizNode.topic.lesson_content as Record<string, unknown>).quiz as QuizQuestion[])
              : ([] as QuizQuestion[])
          }
          attempts={[] as TopicQuizAttemptRow[]}
          isUnlocked
          isLocked={quizNode.attemptsUsed >= 2}
          bestScore={quizNode.bestScore}
          onClose={() => setQuizNode(null)}
          onComplete={handleQuizComplete}
        />
      )}

      {/* ── Level Up Celebration Modal ── */}
      <LevelUpCelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        level={Math.max(2, Math.floor(uniqueNodes.filter((n) => n.status === 'COMPLETED').length / 2) + 1)}
        totalXp={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 40}
        coins={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 15}
      />
    </div>
  );
}
