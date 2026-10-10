'use client';
// src/components/TeacherPortal.tsx
// Teacher Portal Interface — Guild Command & Session Broadcast Hub.

import React, { useState } from 'react';
import { FaIcon } from './common/FaIcon';

interface StudentRating {
  id: string;
  name: string;
  rating: number; // 1 - 5 stars
  feedback: string;
}

interface TeacherPortalProps {
  teacherName?: string;
  isRoomLive?: boolean;
  meetingTitle?: string;
  meetingUrl?: string;
  onPublishReport?: (reportData: any) => void;
}

export function TeacherPortal({
  teacherName = 'Sensei Alpha',
  isRoomLive = true,
  meetingTitle = 'Algorithmic Thinking & Logic Quest #4',
  meetingUrl = 'https://meet.google.com/xyz-abc-def',
  onPublishReport,
}: TeacherPortalProps) {
  const [liveState, setLiveState] = useState(isRoomLive);
  const [ratings, setRatings] = useState<StudentRating[]>([
    { id: '1', name: 'Budi Santoso', rating: 5, feedback: 'Sangat paham materi Scratch loop!' },
    { id: '2', name: 'Siti Rahma', rating: 4, feedback: 'Logika percabangan sudah bagus.' },
    { id: '3', name: 'Andi Wijaya', rating: 5, feedback: 'Berhasil menyelesaikan bonus challenge.' },
  ]);
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  const handleStarClick = (studentId: string, starValue: number) => {
    setRatings((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, rating: starValue } : s))
    );
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setPublished(true);
      if (onPublishReport) {
        onPublishReport({ ratings, reportText });
      }
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Guild Command Header ────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2.5 bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-xs font-black px-4 py-1.5 rounded-full mb-3 border border-indigo-500/30">
              <i className="fa-solid fa-graduation-cap text-cyan-400 fa-fade text-sm icon-glow-cyan" />
              <span>MARKAS KOMANDO GURU / GUILD COMMAND</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ruang Kendali Pengajar — {teacherName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Kelola siaran kelas langsung, penilaian logika siswa, dan publikasi laporan sesi.
            </p>
          </div>

          {/* Broadcast / Live Meet Trigger */}
          <div className="flex-shrink-0">
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm transition-all duration-200 shadow-xl ${
                liveState
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/50'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              <i
                className={`fa-solid fa-tower-broadcast text-base icon-glow-rose ${
                  liveState ? 'fa-beat-fade text-rose-200' : 'fa-hover-beat text-cyan-200'
                }`}
              />
              <span>{liveState ? 'SIARAN LIVE BERLANGSUNG' : 'MULAI SIARAN KELAS'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Student Assessment & Logic Ratings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#161622] rounded-3xl p-6 ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2.5">
                <i className="fa-solid fa-star text-amber-300 fa-fade text-lg icon-glow-amber" />
                Penilaian Logika & Algoritma Siswa
              </h2>
              <span className="text-xs font-bold text-slate-400">Pilih 1 - 5 Bintang</span>
            </div>

            <div className="space-y-4">
              {ratings.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-user-graduate text-cyan-400 text-xs dark:icon-glow-cyan" />
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {student.feedback}
                    </p>
                  </div>

                  {/* Interactive Rating Stars */}
                  <div className="flex items-center gap-1 flex-shrink-0 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(student.id, star)}
                        className="p-1 text-base transition-transform hover:scale-125 focus:outline-none"
                        title={`Beri ${star} bintang`}
                      >
                        <i
                          className={`fa-solid fa-star transition-colors fa-hover-beat ${
                            star <= student.rating
                              ? 'text-amber-300 icon-glow-amber'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Publish Session Report Form */}
        <div className="space-y-6">
          <form
            onSubmit={handlePublish}
            className="bg-white dark:bg-[#161622] rounded-3xl p-6 ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm space-y-5"
          >
            <div className="pb-3 border-b border-slate-100 dark:border-white/10">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-file-signature text-purple-400 text-lg icon-glow-purple" />
                Laporan Ringkasan Sesi
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kirim catatan pembelajaran untuk wali murid.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Catatan Perkembangan
              </label>
              <textarea
                rows={4}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Tuliskan ringkasan materi, kelebihan, dan aspek yang perlu dilatih lagi..."
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {published && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-base" />
                Laporan berhasil dipublikasikan!
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 py-3.5 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-98 disabled:opacity-50"
            >
              <i
                className={`fa-solid text-sm ${
                  isSubmitting
                    ? 'fa-rotate fa-spin'
                    : 'fa-paper-plane fa-hover-bounce'
                }`}
              />
              <span>{isSubmitting ? 'MEMPROSES...' : 'PUBLIKASIKAN LAPORAN'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
