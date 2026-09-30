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

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Halo, Guru! 👋</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {upcoming.length} kelas mendatang
          {upcoming.length > 0 && ` · Berikutnya ${formatDateTime(upcoming[0].meeting_date)}`}
        </p>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Jadwal Kelas
        </h2>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 px-6 text-center">
            <span className="text-4xl mb-3 block">📅</span>
            <p className="font-semibold text-slate-700">Tidak ada kelas mendatang</p>
            <p className="mt-1 text-sm text-slate-400">Jadwal baru akan muncul saat admin membuat sesi.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((m) => {
              const live     = isLive(m.meeting_date);
              const students = m.meeting_students;

              return (
                <div key={m.id}
                  className={`bg-white rounded-xl shadow-sm ring-1 overflow-hidden transition-shadow hover:shadow-md
                    ${live ? "ring-red-300 shadow-red-100" : "ring-slate-200"}`}
                >
                  {/* Live banner */}
                  {live && (
                    <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      KELAS SEDANG BERLANGSUNG
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {m.session_count > 1 && (
                            <Badge variant="neutral">Sesi {m.session_number}/{m.session_count}</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 text-base">{m.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {formatDate(m.meeting_date)} · {formatTime(m.meeting_date)}
                        </p>

                        {/* Students */}
                        {students.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {students.map((ms) => (
                              <span key={ms.student_id}
                                className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                              >
                                🎓 {ms.students?.full_name ?? "–"}
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
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold
                              transition-colors shadow-sm
                              ${live
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5.25 5.053a.25.25 0 00-.25.25v9.394c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V8.653l-4.5-3.6H5.25z"/>
                              <path d="M15 7.5V5.2a.2.2 0 00-.338-.146L11.5 7.5H15z"/>
                            </svg>
                            {live ? "Masuk Kelas Sekarang" : "Buka Link Meeting"}
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

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Riwayat Kelas
          </h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div key={m.id}
                className="bg-white rounded-xl ring-1 ring-slate-200 px-5 py-3 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.title}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(m.meeting_date)}</p>
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
