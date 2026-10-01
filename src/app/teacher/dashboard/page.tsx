// src/app/teacher/dashboard/page.tsx
// Teacher dashboard — shows their assigned upcoming sessions with Join and Complete actions.
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSessionsForTeacher } from "@/features/sessions/queries";
import { isUpcoming, isLive, formatDateTime, formatDate, formatTime } from "@/lib/formatDate";
import { TeacherCompleteAction } from "@/features/sessions/components/TeacherCompleteAction";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Dasbor Guru — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meetings = await getSessionsForTeacher(user.id);

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );
  const past = meetings
    .filter((m) => m.is_completed || !isUpcoming(m.meeting_date))
    .slice(0, 15);

  const teacherName = user.user_metadata?.full_name?.split(" ")[0] ?? "Guru";
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Greeting hero ──────────────────────────────────── */}
      <div className={`relative rounded-2xl overflow-hidden p-6 text-white shadow-lg
        ${hasLive
          ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-200"
          : "bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 shadow-sky-200"
        }`}>
        {/* Bg decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 -left-4 w-48 h-24 rounded-full bg-black/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <p className={`text-sm font-medium ${hasLive ? "text-red-100" : "text-sky-200"}`}>
            Halo kembali,
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
            {teacherName}! 👋
          </h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl
              px-3 py-2 text-sm font-semibold ring-1 ring-white/20">
              <span>📅</span>
              <span>{upcoming.length} kelas mendatang</span>
            </div>
            {upcoming.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl
                px-3 py-2 text-sm font-semibold ring-1 ring-white/20">
                <span>⏰</span>
                <span>Berikutnya: {formatDateTime(upcoming[0].meeting_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming sessions ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
            📅 Jadwal Kelas
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center
              mb-4 text-3xl mx-auto">
              📅
            </div>
            <p className="font-bold text-slate-700 text-lg">Tidak ada kelas mendatang</p>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
              Jadwal baru akan muncul saat admin membuat sesi untuk Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {upcoming.map((m) => {
              const live     = isLive(m.meeting_date);
              const students = m.meeting_students;

              return (
                <div key={m.id}
                  className={`bg-white rounded-2xl shadow-sm ring-1 overflow-hidden
                    transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up
                    ${live ? "ring-red-300 shadow-red-100" : "ring-slate-200/80"}`}
                >
                  {/* Live banner */}
                  {live && (
                    <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white
                      text-xs font-bold px-4 py-2.5 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                      🔴 KELAS SEDANG BERLANGSUNG
                    </div>
                  )}

                  {/* Top color accent for next class */}
                  {!live && (
                    <div className="h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
                  )}

                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {m.session_count > 1 && (
                            <Badge variant="neutral">
                              Sesi {m.session_number}/{m.session_count}
                            </Badge>
                          )}
                          {live && <Badge variant="danger">● LIVE</Badge>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {m.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">📅</span>
                            {formatDate(m.meeting_date)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">🕐</span>
                            {formatTime(m.meeting_date)}
                          </span>
                        </p>

                        {/* Students */}
                        {students.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {students.map((ms) => (
                              <span key={ms.student_id}
                                className="inline-flex items-center gap-1.5 text-xs
                                  bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium
                                  ring-1 ring-slate-200/80"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                                {ms.students?.full_name ?? "–"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {m.link_url && (
                          <a
                            href={m.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5
                              text-sm font-bold transition-all duration-150 shadow-sm
                              hover:shadow-md active:scale-95 hover:-translate-y-0.5
                              ${live
                                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white shadow-red-200"
                                : "bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 text-white shadow-sky-200"
                              }`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M4.5 13.5l7-7M11.5 6.5H4.5M11.5 6.5V13.5"/>
                            </svg>
                            {live ? "Masuk Kelas" : "Buka Meeting"}
                          </a>
                        )}
                        <TeacherCompleteAction meetingId={m.id} meetingTitle={m.title} />
                      </div>
                    </div>
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
              ✅ Riwayat Kelas
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
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center
                  text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                  ✅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{m.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(m.meeting_date)}</p>
                </div>
                <Badge variant="success">✓ Selesai</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
