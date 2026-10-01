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
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Hero greeting ──────────────────────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl
        ${hasLive
          ? "bg-gradient-to-br from-red-600 via-rose-500 to-orange-500 shadow-red-200"
          : "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-indigo-200"
        }`}>

        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-64 h-32 rounded-full bg-black/10 blur-3xl" />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-10"
            style={{backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px"}} />
        </div>

        <div className="relative z-10">
          {hasLive && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm
              text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 ring-1 ring-white/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              KELAS SEDANG BERLANGSUNG!
            </div>
          )}

          <p className={`text-sm font-semibold ${hasLive ? "text-red-100" : "text-indigo-200"}`}>
            Selamat datang kembali,
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
            {studentName}! {hasLive ? "🔥" : "🚀"}
          </h1>

          {next ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2
                text-sm font-medium ring-1 ring-white/20">
                <span>📅</span>
                <span>
                  {hasLive ? "Sedang berlangsung:" : "Kelas berikutmu:"}{" "}
                  <strong className="font-bold">{formatDate(next.meeting_date)}</strong>
                  {" pukul "}
                  <strong className="font-bold">{formatTime(next.meeting_date)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-indigo-100 text-sm">
              Belum ada kelas mendatang. Santai dulu ya! 😊
            </p>
          )}

          {/* XP / progress decoration */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-xs font-bold">
              🏆 {past.length} kelas selesai
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-xs font-bold">
              📅 {upcoming.length} mendatang
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming sessions ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
            📅 Jadwal Kelasmu
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 px-6 text-center">
            <span className="text-5xl mb-4 block">🎯</span>
            <p className="font-bold text-slate-700 text-xl">Belum ada kelas mendatang</p>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
              Guru akan menambahkan jadwal untukmu. Nantikan ya!
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {upcoming.map((m, idx) => {
              const live    = isLive(m.meeting_date);
              const mins    = minutesUntil(m.meeting_date);
              const isFirst = idx === 0;

              return (
                <div
                  key={m.id}
                  className={`rounded-2xl overflow-hidden shadow-sm transition-all duration-200
                    hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up
                    ${live
                      ? "ring-2 ring-red-400 shadow-red-100"
                      : isFirst
                      ? "ring-2 ring-indigo-300 shadow-indigo-100"
                      : "ring-1 ring-slate-200"
                    } bg-white`}
                >
                  {/* Live banner */}
                  {live && (
                    <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white
                      text-xs font-bold px-4 py-2.5 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                      🎉 KELAS SEDANG BERLANGSUNG — MASUK SEKARANG!
                    </div>
                  )}

                  {/* Soon banner */}
                  {!live && isFirst && mins <= 30 && mins > 0 && (
                    <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950
                      text-xs font-bold px-4 py-2 flex items-center gap-2">
                      <span className="text-base">⏰</span>
                      {mins} menit lagi — bersiap-siap ya!
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-5">
                    {m.session_count > 1 && (
                      <span className="inline-flex items-center text-xs font-bold text-indigo-700
                        bg-indigo-50 px-3 py-1 rounded-full ring-1 ring-indigo-200 mb-3">
                        Sesi {m.session_number} dari {m.session_count}
                      </span>
                    )}

                    <h3 className="font-extrabold text-slate-900 text-xl leading-snug">
                      {m.title}
                    </h3>

                    {/* Date/time row */}
                    <div className="mt-2.5 flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs">📅</span>
                        {formatDate(m.meeting_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs">🕐</span>
                        {formatTime(m.meeting_date)}
                      </span>
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <p className="mt-2.5 text-sm text-slate-500 italic line-clamp-2 leading-relaxed">
                        {m.notes}
                      </p>
                    )}

                    {/* CTA */}
                    {m.link_url && (
                      <div className="mt-4">
                        <a
                          href={m.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2.5 rounded-2xl px-6 py-3
                            font-extrabold text-sm transition-all duration-150 active:scale-95
                            shadow-lg hover:shadow-xl hover:-translate-y-0.5
                            ${live
                              ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-300"
                              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-300"
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

      {/* ── Past sessions ──────────────────────────────────── */}
      {past.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              🏆 Kelas yang Sudah Selesai
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
          </div>

          <div className="space-y-2 stagger">
            {past.map((m) => (
              <div key={m.id}
                className="bg-white rounded-2xl ring-1 ring-slate-200/80 px-5 py-3.5
                  flex items-center gap-4 hover:shadow-sm transition-all duration-150
                  hover:ring-emerald-200 group animate-fade-in-up"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center
                  text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                  ✅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{m.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.meeting_date)}</p>
                </div>
                {m.progress_report && (
                  <div className="hidden sm:block max-w-xs">
                    <p className="text-xs text-slate-400 italic line-clamp-1">{m.progress_report}</p>
                  </div>
                )}
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100
                  flex items-center justify-center">
                  <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M3.5 6.5L5.5 8.5L8.5 4"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
