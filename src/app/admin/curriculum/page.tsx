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
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kurikulum</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {modules.length} modul · {totalTopics} topik · {totalNodes} node materi
          </p>
        </div>
      </div>

      {/* Client shell: toolbar (Import / Export buttons) + modal */}
      <CurriculumShell>

        {/* Module list */}
        {modules.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-20 text-center">
            <p className="text-3xl mb-3" aria-hidden="true">📚</p>
            <p className="font-semibold text-slate-700">Belum ada kurikulum</p>
            <p className="text-sm text-slate-400 mt-1">
              Klik <strong>↑ Import JSON</strong> untuk memulai.
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

      {/* Quick-start guide */}
      <details className="text-sm border border-slate-200 rounded-xl">
        <summary className="px-5 py-3 cursor-pointer font-medium text-slate-700 select-none">
          Panduan cepat: cara mengelola kurikulum
        </summary>
        <div className="px-5 pb-5 pt-2 text-slate-600 space-y-2 leading-relaxed">
          <p>
            <strong>1. Buat / edit JSON</strong> — Susun kurikulum di editor teks atau spreadsheet,
            simpan sebagai <code>.json</code> sesuai format schema di atas.
          </p>
          <p>
            <strong>2. Import</strong> — Klik <strong>↑ Import JSON</strong>, paste atau upload file.
            Klik <em>Validasi JSON</em> untuk memeriksa format sebelum menyimpan.
            Import bersifat <em>upsert</em>: modul/topik yang sudah ada diperbarui,
            yang baru ditambahkan.
          </p>
          <p>
            <strong>3. Export</strong> — Klik <strong>↓ Export JSON</strong> untuk mengunduh
            seluruh kurikulum sebagai file <code>.json</code>.
            Edit file tersebut lalu import kembali untuk memperbarui.
          </p>
          <p>
            <strong>4. Hapus</strong> — Gunakan tombol <em>Hapus</em> di setiap modul atau topik.
            Data progress siswa (<code>topic_progress</code>, <code>quiz_attempts</code>)
            <strong> tidak</strong> ikut terhapus.
          </p>
          <p>
            <strong>5. Status</strong> — Topik dengan node otomatis ditandai <em>Published</em>
            saat import. Topik tanpa node tetap <em>Draft</em> dan tidak terlihat siswa.
          </p>
        </div>
      </details>
    </div>
  );
}
