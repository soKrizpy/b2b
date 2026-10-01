// src/app/admin/sessions/page.tsx
// Full session list with all admin actions (edit/cancel/complete).
import type { Metadata } from "next";
import {
  getSessionsForAdmin,
  getTeacherOptions,
  getStudentOptions,
} from "@/features/sessions/queries";
import { SessionCard } from "@/features/sessions/components/SessionCard";
import { AdminSessionActions } from "@/features/sessions/components/AdminSessionActions";
import { CreateSessionModal } from "@/features/sessions/components/CreateSessionModal";
import { isUpcoming } from "@/lib/formatDate";

export const metadata: Metadata = { title: "Kelola Jadwal — Bits2Bytes Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const [meetings, teachers, students] = await Promise.all([
    getSessionsForAdmin(),
    getTeacherOptions(),
    getStudentOptions(),
  ]);

  const upcoming = meetings.filter((m) => !m.is_completed && isUpcoming(m.meeting_date));
  const past     = meetings.filter((m) => m.is_completed || !isUpcoming(m.meeting_date));

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">
            Manajemen Jadwal
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kelola Jadwal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-indigo-600">{upcoming.length}</span> mendatang
            &nbsp;·&nbsp;
            <span className="font-semibold text-slate-500">{past.length}</span> selesai/terlewat
          </p>
        </div>
        <CreateSessionModal teachers={teachers} students={students} />
      </div>

      {/* ── Upcoming section ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
          <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500
            uppercase tracking-widest whitespace-nowrap">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
            Jadwal Mendatang
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2
            border-dashed border-slate-200 bg-white py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 ring-1 ring-indigo-200/80
              flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
            </div>
            <p className="font-bold text-slate-700 text-lg">Belum ada jadwal mendatang</p>
            <p className="mt-2 text-sm text-slate-400 max-w-xs">
              Klik &quot;Buat Jadwal&quot; di atas untuk membuat sesi kelas baru.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
            {upcoming.map((m) => (
              <SessionCard key={m.id} meeting={m} showStudents
                actions={
                  <AdminSessionActions meeting={m} teachers={teachers} students={students} />
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Past section ───────────────────────────────────── */}
      {past.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500
              uppercase tracking-widest whitespace-nowrap">
              <span className="flex h-2 w-2 rounded-full bg-slate-300" />
              Riwayat Kelas
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
            {past.map((m) => (
              <SessionCard key={m.id} meeting={m} showStudents />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
