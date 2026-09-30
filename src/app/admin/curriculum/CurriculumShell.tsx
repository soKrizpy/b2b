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
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg
            hover:bg-indigo-700 active:scale-95 transition-transform"
        >
          ↑ Import JSON
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg
            hover:bg-slate-50 disabled:opacity-40"
        >
          {exporting ? 'Mengekspor…' : '↓ Export JSON'}
        </button>

        {exportError && (
          <span className="text-xs text-red-600" role="alert">{exportError}</span>
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
