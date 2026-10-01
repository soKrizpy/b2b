'use client';
// src/app/admin/curriculum/CurriculumShell.tsx
// Thin client shell: owns the import-modal open state and the export button handler.
// The actual module list is passed as children (server-rendered).

import { useState, useTransition } from 'react';
import { CurriculumImportModal } from '@/features/curriculum/components/CurriculumImportModal';
import { exportCurriculumJson } from '@/features/curriculum/actions';

interface Props { children: React.ReactNode }

export function CurriculumShell({ children }: Props) {
  const [showImport, setShowImport]   = useState(false);
  const [exporting, startExport]      = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = () => {
    setExportError(null);
    startExport(async () => {
      const result = await exportCurriculumJson();
      if (!result.success) { setExportError(result.error); return; }

      // Trigger browser download
      const blob = new Blob(
        [JSON.stringify(result.data, null, 2)],
        { type: 'application/json' }
      );
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `curriculum-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
            bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-sm
            hover:from-indigo-700 hover:to-violet-700 hover:shadow-md hover:-translate-y-0.5
            active:scale-95 transition-all duration-150"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.47 1.47a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L8.75 3.81V10.5a.75.75 0 01-1.5 0V3.81L4.78 6.28a.75.75 0 01-1.06-1.06l3.75-3.75zM3.5 13.5a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"/>
          </svg>
          Import JSON
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
            bg-white text-slate-700 rounded-xl ring-1 ring-slate-200 shadow-sm
            hover:bg-slate-50 hover:ring-slate-300 hover:-translate-y-0.5 hover:shadow-md
            active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4 text-slate-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.47 12.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 10.44V3.75a.75.75 0 00-1.5 0v6.69L4.78 7.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.5 14.25a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"/>
          </svg>
          {exporting ? 'Mengekspor…' : 'Export JSON'}
        </button>

        {exportError && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2
            rounded-xl ring-1 ring-red-200 flex items-center gap-1.5" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
            </svg>
            {exportError}
          </span>
        )}
      </div>

      {/* Module list (server-rendered, passed as children) */}
      {children}

      {/* Import modal — rendered at root level to avoid layout clipping */}
      {showImport && (
        <CurriculumImportModal onClose={() => setShowImport(false)} />
      )}
    </>
  );
}
