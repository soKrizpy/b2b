// src/app/student/lessons/page.tsx
// Student: module list showing enrolled modules with topics.
import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';

export const metadata: Metadata = { title: 'Pelajaran — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function StudentLessonsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const modules = await getStudentModulesWithTopics(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pelajaranku</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {modules.length} modul aktif
        </p>
      </div>

      {modules.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-16 text-center text-slate-400 text-sm">
          Belum ada modul yang ditugaskan. Hubungi gurumu untuk memulai belajar!
        </div>
      )}

      <div className="flex flex-col gap-5">
        {modules.map((mod) => (
          <div key={mod.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{mod.title}</h2>
              {mod.description && (
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{mod.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {mod.level}
                </span>
                <span className="text-xs text-slate-400">
                  {mod.topics.length} topik
                </span>
              </div>
            </div>

            {mod.topics.length === 0 ? (
              <p className="px-5 py-3 text-sm text-slate-400">Belum ada topik tersedia.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mod.topics.map((topic, idx) => (
                  <li key={topic.id}>
                    <Link
                      href={`/student/lessons/topic/${topic.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{topic.title}</p>
                          <p className="text-xs text-slate-400">
                            {topic.challenge_count} challenge
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-400 text-sm flex-shrink-0">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
