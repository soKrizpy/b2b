// src/app/teacher/dashboard/page.tsx
// Teacher dashboard — shows their assigned upcoming sessions with Join and Complete actions.
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForTeacher } from "@/features/sessions/queries";
import { getStudentsForTeacher } from "@/features/users/queries";
import { TeacherStudentsWidget } from "@/features/dashboard/teacher/TeacherStudentsWidget";
import { isUpcoming, isLive, formatDateTime, formatDate, formatTime } from "@/lib/formatDate";
import { TeacherCompleteAction } from "@/features/sessions/components/TeacherCompleteAction";
import { Badge } from "@/components/ui/Badge";
import { AnnouncementBanner } from "@/features/announcements/components/AnnouncementBanner";

export const metadata: Metadata = { title: "Dasbor Guru — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [meetings, mentoredStudents] = await Promise.all([
    getSessionsForTeacher(user.id),
    getStudentsForTeacher(user.id),
  ]);

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
      {/* ── Active Announcement Banners ──────────────────────── */}
      <AnnouncementBanner role="teachers" />

      {/* ── Greeting hero ("Today's Focus") ───────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl transition-all duration-300
        ${hasLive
          ? "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600 shadow-rose-500/20"
          : "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-indigo-500/10 border border-white/10"
        }`}>
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-32 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-10"
            style={{backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px"}} />
        </div>

        <div className="relative z-10">
          {hasLive && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full mb-4 ring-1 ring-white/30">
              <i className="fa-solid fa-tower-broadcast text-rose-200 fa-beat-fade" />
              KELAS SEDANG BERLANGSUNG!
            </div>
          )}

          <div className="flex items-center gap-2 text-indigo-300 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
            <i className="fa-solid fa-graduation-cap text-indigo-400 fa-fade" /> Focus Guru Hari Ini
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            Halo kembali, {teacherName}! 👋
          </h1>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
              <i className="fa-solid fa-user-graduate text-violet-300" />
              <span>{mentoredStudents.length} Siswa Bimbingan</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
              <i className="fa-solid fa-calendar-day text-sky-300" />
              <span>{upcoming.length} Kelas Mendatang</span>
            </div>
            {upcoming.length > 0 && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
                <i className="fa-solid fa-clock text-amber-300" />
                <span>Berikutnya: {formatDateTime(upcoming[0].meeting_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mentored Students Widget ────────────────────────── */}
      <TeacherStudentsWidget students={mentoredStudents} />

      {/* ── Upcoming sessions ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
            <i className="fa-solid fa-calendar-days text-indigo-500" /> Jadwal Kelas Mendatang
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#161622] py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 text-3xl mx-auto">
              <i className="fa-solid fa-calendar-xmark" />
            </div>
            <p className="font-extrabold text-slate-800 dark:text-white text-lg">Tidak ada kelas mendatang</p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              Jadwal baru akan muncul otomatis saat admin membuat sesi untuk Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {upcoming.map((m) => {
              const live     = isLive(m.meeting_date);
              const students = m.meeting_students;

              return (
                <div key={m.id}
                  className={`bg-white dark:bg-[#161622] rounded-3xl shadow-sm ring-1 overflow-hidden
                    transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up
                    ${live ? "ring-red-400 dark:ring-red-500/50 shadow-rose-500/10" : "ring-slate-200/80 dark:ring-white/10"}`}
                >
                  {/* Live banner */}
                  {live && (
                    <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white
                      text-xs font-black px-5 py-2.5 flex items-center gap-2.5">
                      <i className="fa-solid fa-tower-broadcast fa-beat-fade text-rose-200 text-base" />
                      <i className="fa-solid fa-video me-1" /> KELAS SEDANG BERLANGSUNG
                    </div>
                  )}

                  {/* Top color accent for next class */}
                  {!live && (
                    <div className="h-1.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500" />
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {m.session_count > 1 && (
                            <Badge variant="neutral">
                              Sesi {m.session_number}/{m.session_count}
                            </Badge>
                          )}
                          {live && <Badge variant="danger">● LIVE</Badge>}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg leading-snug">
                          {m.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar text-indigo-500" />
                            {formatDate(m.meeting_date)}
                          </span>
                          <span className="text-slate-300 dark:text-white/20">•</span>
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-clock text-indigo-500" />
                            {formatTime(m.meeting_date)}
                          </span>
                        </p>

                        {/* Students */}
                        {students.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {students.map((ms) => (
                              <span key={ms.student_id}
                                className="inline-flex items-center gap-2 text-xs
                                  bg-indigo-500/10 text-indigo-900 dark:text-indigo-300 px-3 py-1.5 rounded-2xl font-bold
                                  border border-indigo-500/20"
                              >
                                <i className="fa-solid fa-user-graduate text-indigo-500 text-[11px]" />
                                {ms.students?.full_name ?? "–"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
                        {m.link_url && (
                          <a
                            href={m.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group inline-flex items-center gap-2 rounded-2xl px-5 py-2.5
                              text-xs font-black transition-all duration-150 shadow-md
                              hover:shadow-lg active:scale-95 hover:-translate-y-0.5
                              ${live
                                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white shadow-rose-500/20"
                                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 text-white shadow-indigo-500/20"
                              }`}
                          >
                            <i className={`fa-solid fa-video ${live ? 'fa-beat-fade' : ''}`} />
                            {live ? "Masuk Kelas" : "Buka Meeting"}
                          </a>
                        )}
                        <TeacherCompleteAction
                          meetingId={m.id}
                          meetingTitle={m.title}
                          studentNames={students.map((s) => s.students?.full_name ?? '').filter(Boolean).join(', ')}
                        />
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
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-500" /> Riwayat Kelas
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
          </div>

          <div className="space-y-2.5 stagger">
            {past.map((m) => (
              <div key={m.id}
                className="bg-white dark:bg-[#161622] rounded-3xl ring-1 ring-slate-200/80 dark:ring-white/10 px-6 py-4
                  flex items-center gap-4 hover:shadow-sm transition-all duration-150
                  hover:ring-emerald-300 dark:hover:ring-emerald-500/40 group animate-fade-in-up"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center
                  text-base flex-shrink-0 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{formatDateTime(m.meeting_date)}</p>
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
