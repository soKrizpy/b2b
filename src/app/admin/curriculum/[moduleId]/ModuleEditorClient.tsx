'use client';
// Full client-side module editor: edit module metadata, add/edit/delete
// topics and their challenges — all using inline accordion forms.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModuleForm } from '@/features/curriculum/components/ModuleForm';
import { TopicForm } from '@/features/curriculum/components/TopicForm';
import { ChallengeForm } from '@/features/challenges/components/ChallengeForm';
import { DeleteTopicButton, DeleteChallengeButton } from '@/features/curriculum/components/DeleteButtons';
import type { ModuleRow, TopicRow, ChallengeRow } from '@/types/database';

interface Props {
  module: ModuleRow;
  topics: TopicRow[];
  challengeMap: Record<number, ChallengeRow[]>;
}

export function ModuleEditorClient({ module, topics, challengeMap }: Props) {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<'module' | null>(null);
  const [openTopicForm, setOpenTopicForm] = useState<number | 'new' | null>(null);
  const [openChallengeForm, setOpenChallengeForm] = useState<{ topicId: number; challengeId: number | 'new' } | null>(null);

  function refresh() { router.refresh(); }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Module metadata ────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <button type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-slate-800"
          onClick={() => setOpenSection(openSection === 'module' ? null : 'module')}>
          Edit Metadata Modul
          <span className="text-slate-400 text-sm">{openSection === 'module' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'module' && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <ModuleForm module={module} onSuccess={() => { setOpenSection(null); refresh(); }} />
          </div>
        )}
      </div>

      {/* ── Topics ────────────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Topik</h2>
          <button type="button" onClick={() => setOpenTopicForm(openTopicForm === 'new' ? null : 'new')}
            className="text-sm text-indigo-600 hover:underline">
            + Tambah Topik
          </button>
        </div>

        {openTopicForm === 'new' && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <TopicForm moduleId={module.id} nextOrderIndex={topics.length + 1}
              onSuccess={() => { setOpenTopicForm(null); refresh(); }} />
          </div>
        )}

        {topics.length === 0 && openTopicForm !== 'new' && (
          <p className="px-5 py-4 text-sm text-slate-400">Belum ada topik.</p>
        )}

        <ul className="divide-y divide-slate-100">
          {topics.map((topic) => {
            const challenges = challengeMap[topic.id] ?? [];
            return (
              <li key={topic.id} className="flex flex-col">
                {/* Topic row */}
                <div className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-400 w-5 text-right">{topic.order_index}.</span>
                    <span className="text-sm font-medium text-slate-800 truncate">{topic.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      topic.status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>{topic.status}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={() => setOpenTopicForm(openTopicForm === topic.id ? null : topic.id)}
                      className="text-xs text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <DeleteTopicButton id={topic.id} label={topic.title} />
                  </div>
                </div>

                {/* Topic edit form */}
                {openTopicForm === topic.id && (
                  <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                    <TopicForm moduleId={module.id} topic={topic}
                      onSuccess={() => { setOpenTopicForm(null); refresh(); }} />
                  </div>
                )}

                {/* Challenges */}
                <div className="pl-10 pr-5 pb-3 flex flex-col gap-2">
                  {challenges.map((ch) => (
                    <div key={ch.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">
                          {ch.order_index}. {ch.title}
                          {ch.allows_file_upload && <span className="ml-1 text-indigo-500">(file)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setOpenChallengeForm(
                              openChallengeForm?.topicId === topic.id && openChallengeForm?.challengeId === ch.id
                                ? null
                                : { topicId: topic.id, challengeId: ch.id }
                            )}
                            className="text-xs text-indigo-600 hover:underline">Edit</button>
                          <DeleteChallengeButton id={ch.id} label={ch.title} />
                        </div>
                      </div>
                      {openChallengeForm?.topicId === topic.id && openChallengeForm?.challengeId === ch.id && (
                        <div className="bg-slate-50 rounded p-3 border border-slate-200">
                          <ChallengeForm topicId={topic.id} challenge={ch}
                            onSuccess={() => { setOpenChallengeForm(null); refresh(); }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add challenge */}
                  {openChallengeForm?.topicId === topic.id && openChallengeForm?.challengeId === 'new' ? (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <ChallengeForm topicId={topic.id} nextOrderIndex={challenges.length + 1}
                        onSuccess={() => { setOpenChallengeForm(null); refresh(); }} />
                    </div>
                  ) : (
                    <button type="button"
                      onClick={() => setOpenChallengeForm({ topicId: topic.id, challengeId: 'new' })}
                      className="self-start text-xs text-indigo-600 hover:underline mt-1">
                      + Tambah Challenge
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
