// src/app/student/dashboard/page.tsx
// Student dashboard — child-friendly card design with direct Join Class button.
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSessionsForStudent } from "@/features/sessions/queries";
import { isUpcoming, isLive, formatDate, formatTime, minutesUntil } from "@/lib/formatDate";

export const metadata: Metadata = { title: "Dasbor Siswa — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const studentName: string =
    user.user_metadata?.full_name?.split(" ")[0] ?? "Kamu";

  const meetings = await getSessionsForStudent(user.id);

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );
  const past = meetings
    .filter((m) => m.is_completed || !isUpcoming(m.meeting_date))
    .slice(0, 10);

  const next = upcoming[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200">
        <p className="text-indigo-200 text-sm font-medium">Selamat datang kembali,</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{studentName}! 🚀</h1>
        {next ? (
          <p className="mt-2 text-indigo-100 text-sm">
            Kelas berikutmu: <span className="font-semibold text-white">{formatDate(next.meeting_date)}</span>
            {" pukul "}<span className="font-semibold text-white">{formatTime(next.meeting_date)}</span>
          </p>
        ) : (
          <p className="mt-2 text-indigo-100 text-sm">Belum ada kelas mendatang. Santai dulu ya! 😊</p>
        )}
      </div>

      {/* Upcoming sessions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Jadwal Kelasmu
        </h2>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 px-6 text-center">
            <span className="text-5xl mb-4 block">🎯</span>
            <p className="font-bold text-slate-700 text-lg">Belum ada kelas mendatang</p>
            <p className="mt-2 text-sm text-slate-400">
              Guru akan menambahkan jadwal untukmu. Nantikan ya!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((m, idx) => {
              const live    = isLive(m.meeting_date);
              const mins    = minutesUntil(m.meeting_date);
              const isFirst = idx === 0;

              return (
                <div
                  key={m.id}
                  className={`rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md
                    ${live
                      ? "ring-2 ring-red-400 shadow-red-100 bg-white"
                      : isFirst
                      ? "ring-2 ring-indigo-300 bg-white"
                      : "ring-1 ring-slate-200 bg-white"
                    }`}
                >
                  {/* Live banner */}
                  {live && (
                    <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                      KELAS SEDANG BERLANGSUNG — MASUK SEKARANG!
                    </div>
                  )}

                  {/* Soon banner */}
                  {!live && isFirst && mins <= 30 && mins > 0 && (
                    <div className="bg-amber-400 text-amber-950 text-xs font-bold px-4 py-1.5">
                      ⏰ {mins} menit lagi — bersiap-siap ya!
                    </div>
                  )}

                  <div className="p-5">
                    {/* Session badge */}
                    {m.session_count > 1 && (
                      <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full ring-1 ring-indigo-200 mb-2">
                        Sesi {m.session_number} dari {m.session_count}
                      </span>
                    )}

                    <h3 className="font-bold text-slate-900 text-lg leading-snug">{m.title}</h3>

                    {/* Date/time row */}
                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 0a.5.5 0 01.5.5V2h4V.5a.5.5 0 011 0V2h1a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2h1V.5a.5.5 0 01.5-.5zM2 5v8a1 1 0 001 1h10a1 1 0 001-1V5H2z"/>
                        </svg>
                        {formatDate(m.meeting_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
                          <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
                        </svg>
                        {formatTime(m.meeting_date)}
                      </span>
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <p className="mt-2 text-sm text-slate-500 italic line-clamp-2">{m.notes}</p>
                    )}

                    {/* CTA */}
                    {m.link_url && (
                      <div className="mt-4">
                        <a
                          href={m.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm
                            transition-all active:scale-95
                            ${live
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-300"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                            }`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z"/>
                          </svg>
                          {live ? "🎉 Masuk Kelas Sekarang!" : "Gabung Meeting"}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past sessions */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Kelas yang Sudah Selesai 🏆
          </h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div key={m.id}
                className="bg-white rounded-xl ring-1 ring-slate-200 px-5 py-3 flex items-center gap-4"
              >
                <span className="text-lg">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{m.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(m.meeting_date)}</p>
                </div>
                {m.progress_report && (
                  <div className="hidden sm:block max-w-xs">
                    <p className="text-xs text-slate-500 italic line-clamp-1">{m.progress_report}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
