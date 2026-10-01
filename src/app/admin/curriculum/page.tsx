// src/app/admin/curriculum/page.tsx
// Admin curriculum management — JSON import/export engine.
// Server Component: fetches data, renders CurriculumShell + ModuleAccordion list.

import type { Metadata } from 'next';
import { getAllModulesWithTopics } from '@/features/curriculum/queries';
import { CurriculumShell } from './CurriculumShell';
import { ModuleAccordion } from './ModuleAccordion';

export const metadata: Metadata = { title: 'Kurikulum — Admin Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function AdminCurriculumPage() {
  const modules = await getAllModulesWithTopics();

  const totalTopics = modules.reduce((s, m) => s + m.topics.length, 0);
  const totalNodes  = modules.reduce((s, m) =>
    s + m.topics.reduce((ts, t) => {
      const lc = t.lesson_content as { learningPath?: unknown[] } | null;
      return ts + (lc?.learningPath?.length ?? 0);
    }, 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">
            Manajemen Kurikulum
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kurikulum
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {[
              { label: "Modul", value: modules.length, icon: "📚" },
              { label: "Topik", value: totalTopics, icon: "📄" },
              { label: "Node Materi", value: totalNodes, icon: "🧩" },
            ].map(({ label, value, icon }) => (
              <span key={label}
                className="inline-flex items-center gap-1.5 text-xs font-semibold
                  text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full ring-1 ring-slate-200/80">
                <span>{icon}</span>
                <span className="text-slate-900 font-bold">{value}</span>
                <span className="text-slate-500">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Client shell: Import / Export toolbar + modal ──── */}
      <CurriculumShell>
        {/* Module list */}
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl
            border-2 border-dashed border-slate-200 bg-white py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 ring-1 ring-slate-200
              flex items-center justify-center mb-4 text-4xl">
              📚
            </div>
            <p className="font-bold text-slate-700 text-lg">Belum ada kurikulum</p>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">
              Klik <strong className="text-slate-600">↑ Import JSON</strong> di atas untuk
              memuat kurikulum pertama Anda.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {modules.map((mod) => (
              <ModuleAccordion key={mod.id} module={mod} />
            ))}
          </div>
        )}
      </CurriculumShell>

      {/* ── Quick-start guide ──────────────────────────────── */}
      <details className="text-sm border border-slate-200/80 rounded-2xl bg-white
        shadow-sm overflow-hidden">
        <summary className="px-5 py-4 cursor-pointer font-semibold text-slate-700
          select-none flex items-center gap-2 hover:bg-slate-50 transition-colors">
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
          </svg>
          Panduan cepat: cara mengelola kurikulum
        </summary>
        <div className="px-5 pb-5 pt-3 text-slate-600 space-y-3 leading-relaxed
          border-t border-slate-100 text-[13px]">
          {[
            ["1. Buat / edit JSON", "Susun kurikulum di editor teks atau spreadsheet, simpan sebagai .json sesuai format schema."],
            ["2. Import", "Klik ↑ Import JSON, paste atau upload file. Klik Validasi JSON untuk memeriksa format. Import bersifat upsert: modul/topik yang ada diperbarui, yang baru ditambahkan."],
            ["3. Export", "Klik ↓ Export JSON untuk mengunduh seluruh kurikulum sebagai file .json."],
            ["4. Hapus", "Gunakan tombol Hapus di setiap modul atau topik. Data progress siswa tidak ikut terhapus."],
            ["5. Status", "Topik dengan node otomatis ditandai Published saat import. Topik tanpa node tetap Draft."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3">
              <span className="font-bold text-slate-800 flex-shrink-0">{title}</span>
              <span className="text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
