'use client';
// src/app/admin/curriculum/ModuleAccordion.tsx
// Expandable module card: Module → Topics → Nodes preview.
// Delete actions live here (client-side transitions with router.refresh).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteModule, deleteTopic } from '@/features/curriculum/actions';
import type { ModuleWithTopics } from '@/features/curriculum/queries';

interface Props { module: ModuleWithTopics }

const NODE_TYPE_LABEL: Record<string, string> = {
  lesson:    'Teori',
  theory:    'Teori',
  quiz:      'Quiz',
  challenge: 'Challenge',
  code:      'Kode',
  practice:  'Latihan',
};

export function ModuleAccordion({ module: mod }: Props) {
  const router          = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingDel, startDel] = useTransition();

  const handleDeleteModule = () => {
    if (!confirm(`Hapus modul "${mod.title}" beserta semua topiknya? Tindakan ini tidak dapat dibatalkan.`)) return;
    const fd = new FormData();
    fd.append('id', String(mod.id));
    startDel(async () => { await deleteModule(null, fd); router.refresh(); });
  };

  const handleDeleteTopic = (topicId: number, topicTitle: string) => {
    if (!confirm(`Hapus topik "${topicTitle}"?`)) return;
    const fd = new FormData();
    fd.append('id', String(topicId));
    startDel(async () => { await deleteTopic(null, fd); router.refresh(); });
  };

  // Extract learningPath nodes from topic.lesson_content JSONB
  const getNodes = (lc: unknown): Array<{ id: string; type: string; title: string; xp?: number }> => {
    if (!lc || typeof lc !== 'object') return [];
    const typed = lc as Record<string, unknown>;
    const arr = Array.isArray(typed.learningPath) ? typed.learningPath : [];
    return arr as Array<{ id: string; type: string; title: string; xp?: number }>;
  };

  return (
    <div className={`border rounded-xl bg-white overflow-hidden transition-opacity ${pendingDel ? 'opacity-50 pointer-events-none' : ''} ${open ? 'border-indigo-300' : 'border-slate-200'}`}>

      {/* ── Module header row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="text-slate-400 text-xs w-4 flex-shrink-0" aria-hidden="true">
            {open ? '▼' : '▶'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 truncate">{mod.title}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">
                {mod.level}
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">
                {mod.gamification_type}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {mod.topics.length} topik
              </span>
            </div>
            {mod.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{mod.description}</p>
            )}
          </div>
        </button>

        {/* Delete module */}
        <button
          type="button"
          onClick={handleDeleteModule}
          disabled={pendingDel}
          className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40 px-2 py-1"
        >
          Hapus
        </button>
      </div>

      {/* ── Topics + nodes (expanded) ──────────────────────────────────── */}
      {open && (
        <div className="border-t border-slate-100">
          {mod.topics.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 italic">
              Modul ini belum memiliki topik. Import JSON untuk menambahkan.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mod.topics.map((topic) => {
                const nodes = getNodes(topic.lesson_content);
                return (
                  <li key={topic.id} className="px-5 py-4">
                    {/* Topic header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">
                            {topic.order_index}.
                          </span>
                          <span className="text-sm font-medium text-slate-800">{topic.title}</span>
                          {/* Published / Draft badge */}
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                            topic.status === 'published'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {topic.status === 'published' ? '● Published' : '○ Draft'}
                          </span>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {topic.description && (
                          <p className="text-xs text-slate-500 mt-0.5 pl-8 line-clamp-2">
                            {topic.description}
                          </p>
                        )}
                      </div>

                      {/* Delete topic */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(topic.id, topic.title)}
                        disabled={pendingDel}
                        className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40 px-2 py-0.5"
                      >
                        Hapus
                      </button>
                    </div>

                    {/* Nodes preview */}
                    {nodes.length > 0 && (
                      <ol className="mt-2 pl-10 flex flex-col gap-1">
                        {nodes.map((node, idx) => (
                          <li key={node.id ?? idx}
                            className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="text-slate-300 tabular-nums w-4 text-right flex-shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0 font-mono">
                              {NODE_TYPE_LABEL[node.type] ?? node.type}
                            </span>
                            <span className="truncate">{node.title}</span>
                            {typeof node.xp === 'number' && node.xp > 0 && (
                              <span className="text-amber-600 flex-shrink-0">+{node.xp} XP</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
