// src/app/admin/dashboard/page.tsx
import type { Metadata } from "next";
import {
  getSessionsForAdmin,
  getTeacherOptions,
  getStudentOptions,
} from "@/features/sessions/queries";
import { SessionCard } from "@/features/sessions/components/SessionCard";
import { AdminSessionActions } from "@/features/sessions/components/AdminSessionActions";
import { CreateSessionModal } from "@/features/sessions/components/CreateSessionModal";
import { isUpcoming, isLive } from "@/lib/formatDate";

export const metadata: Metadata = { title: "Dasbor Admin — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [meetings, teachers, students] = await Promise.all([
    getSessionsForAdmin(),
    getTeacherOptions(),
    getStudentOptions(),
  ]);

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );
  const past = meetings
    .filter((m) => m.is_completed || !isUpcoming(m.meeting_date))
    .slice(0, 20);

  const live = meetings.filter((m) => isLive(m.meeting_date));

  const totalStudents = new Set(
    meetings.flatMap((m) => m.meeting_students.map((ms) => ms.student_id))
  ).size;

  const stats = [
    {
      label: "Mendatang",
      value: upcoming.length,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.25 2A2.25 2.25 0 003 4.25v11.5A2.25 2.25 0 005.25 18h9.5A2.25 2.25 0 0017 15.75V4.25A2.25 2.25 0 0014.75 2h-9.5zm0 1.5h9.5a.75.75 0 01.75.75v.75H4.5v-.75a.75.75 0 01.75-.75zm-.75 3h11V15.75a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75V6.5z"/>
        </svg>
      ),
      gradient: "from-indigo-500 to-violet-600",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      ring: "ring-indigo-200/80",
    },
    {
      label: "Selesai",
      value: meetings.filter((m) => m.is_completed).length,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200/80",
    },
    {
      label: "Siswa Aktif",
      value: totalStudents,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
        </svg>
      ),
      gradient: "from-sky-500 to-blue-600",
      bg: "bg-sky-50",
      text: "text-sky-700",
      ring: "ring-sky-200/80",
    },
    {
      label: "Guru Pengajar",
      value: teachers.length,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/>
        </svg>
      ),
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200/80",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">
            Panel Kontrol
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Dasbor Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola jadwal kelas dan pantau perkembangan siswa.
          </p>
        </div>
        <CreateSessionModal teachers={teachers} students={students} />
      </div>

      {/* ── Live alert banner ──────────────────────────────── */}
      {live.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl
          bg-gradient-to-r from-emerald-600 to-teal-600 text-white
          shadow-lg shadow-emerald-200/60 ring-1 ring-emerald-500/30">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Kelas Sedang Berlangsung!</p>
            <p className="text-emerald-100 text-xs mt-0.5 truncate">
              {live.map((m) => m.title).join(" · ")}
            </p>
          </div>
          <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm
            px-3 py-1.5 rounded-lg ring-1 ring-white/30 flex-shrink-0">
            {live.length} LIVE
          </span>
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon, gradient, bg, text, ring }) => (
          <div key={label}
            className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm
              hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5
              animate-fade-in-up">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient}
              flex items-center justify-center mb-3 shadow-sm text-white`}>
              {icon}
            </div>
            <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Upcoming sessions ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500
              uppercase tracking-widest whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
              Jadwal Mendatang
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
          </div>
          {upcoming.length > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100
              px-2.5 py-1 rounded-full ring-1 ring-slate-200/80 flex-shrink-0">
              {upcoming.length}
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl
            border-2 border-dashed border-slate-200 bg-white py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 ring-1 ring-indigo-200/80
              flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
            </div>
            <p className="font-bold text-slate-700 text-lg">Belum ada jadwal mendatang</p>
            <p className="mt-2 text-sm text-slate-400 max-w-xs">
              Klik &quot;Buat Jadwal&quot; di atas untuk membuat sesi baru.
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

      {/* ── Past sessions ──────────────────────────────────── */}
      {past.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500
              uppercase tracking-widest whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-slate-300 flex-shrink-0" />
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
