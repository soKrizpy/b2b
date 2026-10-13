import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d0d14] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black text-2xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman yang Anda cari mungkin telah dipindahkan atau tidak tersedia.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
