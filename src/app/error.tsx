'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d0d14] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-black text-2xl">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Maaf, terjadi kendala saat memproses halaman ini.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Coba Lagi
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
          >
            Kembali
          </Link>
        </div>
      </div>
    </div>
  );
}
