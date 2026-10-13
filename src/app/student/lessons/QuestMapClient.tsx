'use client';
// src/app/student/lessons/QuestMapClient.tsx
// Responsive Zigzag Snake Path Quest Map.
//
// RENDERING MODEL — single DOM tree, no duplicate:
//   Use a JS state variable `chunkSize` driven by a useEffect + resize observer.
//   Default (SSR + first paint): 3. After mount hydration: 5 on lg.
//   This ensures exactly ONE DOM tree is rendered at all times — no hidden/visible twin.
//
// CONNECTOR MODEL:
//   • Horizontal: a thin <div> with flex-1 height=4px sitting in the same flex row as nodes.
//   • Turn: right-angle bracket: a fixed-width div with right+bottom (or left+bottom) border,
//     no absolute positioning, no margin tricks.

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuizModal } from '@/features/quiz/components/QuizModal';
import { LevelUpCelebrationModal } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { TIER_CONFIG } from '@/features/certificates/queries';
import type { QuestMapData, QuestTopicNode, NodeStatus } from '@/features/quiz/questMapQueries';
import type { TopicQuizAttemptRow } from '@/types/database';
import type { QuizQuestion } from '@/features/curriculum/validation';

// ── Types ─────────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<NodeStatus, { label: string }> = {
  COMPLETED:   { label: 'Selesai'                },
  NEEDS_QUIZ:  { label: 'Kerjakan Kuis Sekarang' },
  ACTIVE_NEXT: { label: 'Siap Dipelajari'         },
  LOCKED:      { label: 'Terkunci'               },
};

// ── Mini stars ────────────────────────────────────────────────────────────────
// Bug fix #2: If status=COMPLETED but stars=0 (no quiz / auto-complete),
// treat as 3 stars so completed nodes always show gold stars.

function MiniStars({ count, status }: { count: 0 | 1 | 2 | 3; status: NodeStatus }) {
  const effectiveCount: 0 | 1 | 2 | 3 =
    status === 'COMPLETED' && count === 0 ? 3 : count;

  return (
    <div className="flex gap-0.5 mt-1 justify-center select-none" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <i
          key={n}
          className={`fa-solid fa-star text-[10px] transition-colors ${
            n <= effectiveCount
              ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]'
              : 'text-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

// ── Node circle ───────────────────────────────────────────────────────────────

const NODE_SIZE = 'w-12 h-12 sm:w-14 sm:h-14'; // consistent size used for connector math too

function NodeCircle({
  status,
  index,
  isFinal = false,
  isActive,
  onEnter,
  onClick,
}: {
  status:   NodeStatus | 'FINAL';
  index:    number;
  isFinal?: boolean;
  isActive: boolean;
  onEnter:  () => void;
  onClick:  () => void;
}) {
  const base = `${NODE_SIZE} rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-lg select-none`;
  const activeRing = isActive ? 'ring-4 ring-offset-2 ring-offset-zinc-950 scale-110' : '';

  if (isFinal) {
    const unlocked = status === 'ACTIVE_NEXT' || status === 'COMPLETED';
    return (
      <button
        type="button"
        onMouseEnter={onEnter}
        onClick={onClick}
        aria-label="Ujian Akhir"
        className={`${base} bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600
          text-black border-2 border-yellow-200 shadow-amber-500/40 ring-2 ring-amber-400/50 ${activeRing}
          ${!unlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}`}
      >
        <span className="text-xl">🏆</span>
      </button>
    );
  }

  const getClasses = () => {
    switch (status as NodeStatus) {
      case 'COMPLETED':
        return 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white border-2 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/40 hover:scale-110 cursor-pointer';
      case 'NEEDS_QUIZ':
        return 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-black border-2 border-yellow-200 ring-4 ring-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse hover:scale-110 cursor-pointer';
      case 'ACTIVE_NEXT':
        return 'bg-zinc-900 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/30 hover:scale-110 cursor-pointer';
      default:
        return 'bg-zinc-900/60 text-zinc-600 border border-zinc-700/40 opacity-55 cursor-default';
    }
  };

  const inner = () => {
    switch (status as NodeStatus) {
      case 'COMPLETED':  return <i className="fa-solid fa-check text-white text-base" />;
      case 'NEEDS_QUIZ': return <i className="fa-solid fa-bolt text-black text-base" />;
      case 'ACTIVE_NEXT':return <span className="text-cyan-300 font-black tabular-nums text-sm">{index + 1}</span>;
      default:           return <i className="fa-solid fa-lock text-zinc-600 text-sm" />;
    }
  };

  return (
    <button
      type="button"
      onMouseEnter={status !== 'LOCKED' ? onEnter : undefined}
      onClick={onClick}
      disabled={status === 'LOCKED'}
      aria-label={`Topik ${index + 1}: ${STATUS_CONFIG[status as NodeStatus].label}`}
      className={`${base} ${getClasses()} ${activeRing}`}
    >
      {inner()}
    </button>
  );
}

// ── Popover card ──────────────────────────────────────────────────────────────

function PopoverCard({
  node,
  isFinal,
  moduleId,
  isModuleComplete,
  cert,
  onQuizClick,
  onClose,
}: {
  node:             QuestTopicNode | null;
  isFinal:          boolean;
  moduleId:         number;
  isModuleComplete: boolean;
  cert:             { tier: string; score: number; certificate_number: string } | null;
  onQuizClick:      () => void;
  onClose:          () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const cardCls = `absolute z-40 bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2
    w-64 sm:w-72 rounded-2xl
    bg-zinc-950/98 border border-zinc-700/80 backdrop-blur-xl
    shadow-2xl shadow-black/60
    p-4 flex flex-col gap-3 text-left
    animate-in fade-in zoom-in-95 duration-150 origin-bottom`;

  const Caret = () => (
    <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5
      bg-zinc-950 border-b border-r border-zinc-700/80 rotate-45" />
  );

  // ── Final ──
  if (isFinal) {
    return (
      <div ref={ref} className={cardCls}>
        <Caret />
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏆</span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400
              bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 inline-block mb-0.5">
              Ujian Akhir Modul
            </span>
            <p className="text-sm font-black text-white">Tryout 20 Soal Final</p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Uji semua kemampuanmu dalam satu ujian akhir untuk mengklaim sertifikat resmi.
        </p>
        {cert ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            <p className="text-xs font-bold text-amber-300">
              {TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].medal}{' '}
              {TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG].label} — Skor {cert.score}
            </p>
          </div>
        ) : isModuleComplete ? (
          <Link
            href={`/student/assessment/${moduleId}`}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-xs font-extrabold text-black
              bg-gradient-to-r from-amber-400 to-orange-500
              shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            <i className="fa-solid fa-play text-[10px]" /> Mulai Ujian Akhir
          </Link>
        ) : (
          <p className="text-[10px] text-zinc-500 text-center font-bold">
            Selesaikan semua topik untuk membuka ujian akhir.
          </p>
        )}
      </div>
    );
  }

  if (!node) return null;

  const cfg = STATUS_CONFIG[node.status];
  const description = (node.topic.description ?? '').slice(0, 100) || 'Tekan untuk mempelajari topik ini.';

  return (
    <div ref={ref} className={cardCls}>
      <Caret />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5
            rounded-full border mb-1 inline-block
            ${node.status === 'COMPLETED'   ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
              node.status === 'NEEDS_QUIZ'  ? 'bg-amber-500/20  text-amber-300  border-amber-500/40'    :
              node.status === 'ACTIVE_NEXT' ? 'bg-cyan-500/15   text-cyan-300   border-cyan-500/30'     :
                                              'bg-zinc-800/80   text-zinc-500   border-zinc-700/50'     }`}>
            {cfg.label}
          </span>
          <p className="text-sm font-extrabold text-white leading-snug">{node.topic.title}</p>
        </div>
        {node.status === 'COMPLETED' && node.bestScore > 0 && (
          <span className="flex-shrink-0 text-[10px] font-black tabular-nums
            bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            {node.bestScore}%
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {description}{description.length >= 100 && '…'}
      </p>

      {/* Challenge count */}
      {node.topic.challenge_count > 0 && (
        <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
          <i className="fa-solid fa-flag text-[9px]" />
          {node.topic.challenge_count} tantangan
        </p>
      )}

      {/* Stars */}
      {node.status === 'COMPLETED' && (
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n) => {
            const effectiveStars = node.stars === 0 ? 3 : node.stars;
            return (
              <i key={n}
                className={`fa-solid fa-star text-sm ${
                  n <= effectiveStars
                    ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]'
                    : 'text-zinc-700'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      {node.status === 'NEEDS_QUIZ' && (
        <button
          type="button"
          onClick={() => { onQuizClick(); onClose(); }}
          className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-xs font-extrabold text-black
            bg-gradient-to-r from-amber-400 to-orange-500
            shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <i className="fa-solid fa-play text-[10px]" />
          {node.attemptsUsed === 1 ? 'Coba Lagi' : 'Mulai Kuis'}
        </button>
      )}
      {node.status === 'ACTIVE_NEXT' && (
        <Link
          href={`/student/lessons/topic/${node.topic.id}`}
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-xs font-extrabold text-black
            bg-gradient-to-r from-cyan-400 to-blue-500
            shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <i className="fa-solid fa-book-open text-[10px]" /> Mulai Belajar
        </Link>
      )}
      {node.status === 'COMPLETED' && (
        <Link
          href={`/student/lessons/topic/${node.topic.id}`}
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 py-2 rounded-xl
            text-xs font-semibold text-zinc-300
            bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
        >
          <i className="fa-solid fa-rotate-right text-[10px]" /> Ulangi Materi
        </Link>
      )}
    </div>
  );
}

// ── QuestMapClient root ───────────────────────────────────────────────────────

export function QuestMapClient({ questData, cert }: Props) {
  const router = useRouter();

  const [quizNode, setQuizNode]   = useState<QuestTopicNode | null>(null);
  const [popover,  setPopover]    = useState<PopoverAnchor | null>(null);
  // Bug fix #1: single chunk size driven by JS — one DOM tree only
  const [chunkSize, setChunkSize] = useState(3); // default 3, updated after mount

  useEffect(() => {
    const update = () => setChunkSize(window.innerWidth >= 1024 ? 5 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { mod, nodes, moduleComplete, hasFinal } = questData;

  // Bug fix #1: deduplicate nodes by topic id before chunking
  const uniqueNodes = Array.from(
    new Map(nodes.map((n) => [n.topic.id, n])).values()
  );

  const [showCelebration, setShowCelebration] = useState(false);

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
      <div className="text-center text-sm text-zinc-500 italic py-8
        bg-zinc-900/40 rounded-2xl border border-zinc-800/60 mx-4">
        Belum ada topik yang dipublikasikan untuk modul ini.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8 md:gap-10">

      {/* ── RPG Map Legend (Zero-Pill Discipline) ── */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-zinc-400 flex-wrap pb-2 border-b border-zinc-800/60 select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <span>Waypoint Tuntas</span>
        </span>
        <span aria-hidden="true" className="text-zinc-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
          <span>Ujian Rune</span>
        </span>
        <span aria-hidden="true" className="text-zinc-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
          <span>Siap Dipelajari</span>
        </span>
        <span aria-hidden="true" className="text-zinc-600">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          <span>Terkunci</span>
        </span>
      </div>

      {rows.map((row, rowIdx) => {
        const isReverse = rowIdx % 2 === 1;
        const isLastRow = rowIdx === rows.length - 1;
        const displayNodes = isReverse ? [...row].reverse() : row;
        const lastInRow = row[row.length - 1]; // logical end of this row

        return (
          <div key={`row-${rowIdx}`} className="flex items-center w-full gap-0">
            {displayNodes.map((node, colIdx) => {
              const globalIdx = uniqueNodes.indexOf(node);
              const isPopoverOpen = popover?.nodeId === node.topic.id && !popover?.isFinal;
              const isLastInDisplay = colIdx === displayNodes.length - 1;

              // Logical end of row drops vertically to next row / Final Boss
              const isLogicalEnd = node.topic.id === lastInRow.topic.id;
              const hasVerticalDrop = isLogicalEnd && (!isLastRow || hasFinal);
              const dropActive = node.status === 'COMPLETED';

              // Horizontal connector between adjacent nodes in display order
              const nextDisplayNode = displayNodes[colIdx + 1];
              let hConnActive = false;
              if (nextDisplayNode) {
                if (!isReverse) {
                  hConnActive = node.status === 'COMPLETED';
                } else {
                  hConnActive = nextDisplayNode.status === 'COMPLETED';
                }
              }
              const hConnLine = hConnActive
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-zinc-800';

              return (
                <div key={node.topic.id} className="flex items-center flex-1 min-w-0">
                  {/* Node + stars + popover + vertical drop line */}
                  <div className="relative flex flex-col items-center flex-shrink-0">
                    <NodeCircle
                      status={node.status}
                      index={globalIdx}
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
                    <MiniStars count={node.stars} status={node.status} />

                    {/* Straight vertical drop connector */}
                    {hasVerticalDrop && (
                      <div
                        className={`absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-8 md:h-10 z-0 pointer-events-none transition-colors rounded-full ${
                          dropActive
                            ? 'bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : 'bg-zinc-800'
                        }`}
                      />
                    )}

                    {isPopoverOpen && (
                      <PopoverCard
                        node={node}
                        isFinal={false}
                        moduleId={mod.id}
                        isModuleComplete={moduleComplete}
                        cert={null}
                        onQuizClick={() => openQuiz(node)}
                        onClose={() => setPopover(null)}
                      />
                    )}
                  </div>

                  {/* Horizontal connector strictly between adjacent display items */}
                  {!isLastInDisplay && (
                    <div className={`h-1.5 flex-1 ${hConnLine} transition-colors rounded-full`} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Final Boss ── */}
      {hasFinal && (() => {
        const lastRow = rows[rows.length - 1];
        const lastRowIdx = rows.length - 1;
        const lastRowReverse = lastRowIdx % 2 === 1;
        const lastRowDisplayNodes = lastRowReverse ? [...lastRow].reverse() : lastRow;
        const lastTopicNode = uniqueNodes[uniqueNodes.length - 1];

        const targetColIdx = lastRowDisplayNodes.findIndex(
          (n) => n.topic.id === lastTopicNode.topic.id
        );

        const finalStatus: NodeStatus = moduleComplete ? 'ACTIVE_NEXT' : 'LOCKED';
        const finalPopoverOpen = popover?.nodeId === FINAL_ID && popover?.isFinal;

        return (
          <div className="flex items-center w-full gap-0">
            {lastRowDisplayNodes.map((_, colIdx) => {
              const isTarget = colIdx === targetColIdx;
              const isLast = colIdx === lastRowDisplayNodes.length - 1;

              if (!isTarget) {
                return (
                  <div key={`final-spacer-${colIdx}`} className="flex items-center flex-1 min-w-0">
                    <div className={`${NODE_SIZE} invisible flex-shrink-0`} />
                    {!isLast && <div className="h-1 flex-1 opacity-0" />}
                  </div>
                );
              }

              return (
                <div key="final-boss-cell" className="flex items-center flex-1 min-w-0">
                  <div className="relative flex flex-col items-center flex-shrink-0">
                    <NodeCircle
                      status={finalStatus}
                      index={uniqueNodes.length}
                      isFinal
                      isActive={!!finalPopoverOpen}
                      onEnter={() => setPopover({ nodeId: FINAL_ID, isFinal: true })}
                      onClick={() =>
                        setPopover((prev) =>
                          prev?.nodeId === FINAL_ID ? null : { nodeId: FINAL_ID, isFinal: true }
                        )
                      }
                    />
                    <span className="mt-1 text-[9px] font-black text-amber-400 uppercase tracking-widest select-none">
                      Final
                    </span>

                    {finalPopoverOpen && (
                      <PopoverCard
                        node={null}
                        isFinal
                        moduleId={mod.id}
                        isModuleComplete={moduleComplete}
                        cert={cert}
                        onQuizClick={() => {}}
                        onClose={() => setPopover(null)}
                      />
                    )}
                  </div>
                  {!isLast && <div className="h-1 flex-1 opacity-0" />}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Quiz modal ── */}
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

      {/* ── Level-Up / Victory Celebration Modal ── */}
      <LevelUpCelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        level={Math.max(2, Math.floor(uniqueNodes.filter((n) => n.status === 'COMPLETED').length / 2) + 1)}
        totalXp={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 40}
        coins={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 15}
        studentName="Petualang Kode"
      />
    </div>
  );
}
