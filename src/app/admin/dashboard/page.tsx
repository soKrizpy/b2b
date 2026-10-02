// src/app/admin/dashboard/page.tsx
// Admin operational hub — KPI cards, filter tabs, 2-column SaaS command center.
import type { Metadata } from "next";
import {
  getSessionsForAdmin,
  getTeacherOptions,
  getStudentOptions,
} from "@/features/sessions/queries";
import { computeAdminMetrics } from "@/features/dashboard/admin/metrics";
import { DashboardShell } from "@/features/dashboard/admin/DashboardShell";
import { isLive } from "@/lib/formatDate";

export const metadata: Metadata = { title: "Dasbor Admin — Bits2Bytes" };
export const dynamic = "force-dynamic";

// ── Refined KPI card ──────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  icon,
  bgColor,
  borderColor,
  textColor,
  iconBg,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconBg: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3
        border ${bgColor} ${borderColor} shadow-sm
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {pulse && value > 0 && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        )}
      </div>

      <div>
        <p className={`text-2xl sm:text-3xl font-extrabold ${textColor} tabular-nums tracking-tight`}>
          {value}
        </p>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const [meetings, teachers, students] = await Promise.all([
    getSessionsForAdmin(),
    getTeacherOptions(),
    getStudentOptions(),
  ]);

  const metrics = computeAdminMetrics(meetings);
  const liveNow = meetings.filter((m) => isLive(m.meeting_date));

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#7cc62f] mb-1">
            Pusat Kontrol Operasional
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dasbor Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor aktivitas pembelajaran, jadwal kelas, dan performa akademik secara real-time.
          </p>
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Live Sekarang */}
        <KPICard
          label="Live Sekarang"
          value={metrics.liveNowCount}
          bgColor="bg-emerald-50/70 dark:bg-emerald-950/20"
          borderColor="border-emerald-200/80 dark:border-emerald-800/40"
          textColor="text-emerald-950 dark:text-emerald-200"
          iconBg="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
          pulse
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />

        {/* Jadwal Hari Ini */}
        <KPICard
          label="Jadwal Hari Ini"
          value={metrics.todayTotalCount}
          bgColor="bg-indigo-50/70 dark:bg-indigo-950/20"
          borderColor="border-indigo-200/80 dark:border-indigo-800/40"
          textColor="text-indigo-950 dark:text-indigo-200"
          iconBg="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />

        {/* Siswa Aktif */}
        <KPICard
          label="Siswa Aktif"
          value={metrics.activeStudentsCount}
          bgColor="bg-violet-50/70 dark:bg-violet-950/20"
          borderColor="border-violet-200/80 dark:border-violet-800/40"
          textColor="text-violet-950 dark:text-violet-200"
          iconBg="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A.75.75 0 010 7.848V7.5a.75.75 0 01.75-.75h22.5a.75.75 0 01.75.75v.348a.75.75 0 01-.351.636 50.655 50.655 0 00-2.658.813m-15.482 0A50.71 50.71 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
          }
        />

        {/* Perlu Perhatian */}
        <KPICard
          label="Perlu Perhatian"
          value={metrics.needsAttentionCount}
          bgColor="bg-amber-50/70 dark:bg-amber-950/20"
          borderColor="border-amber-200/80 dark:border-amber-800/40"
          textColor="text-amber-950 dark:text-amber-200"
          iconBg="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
          pulse={metrics.needsAttentionCount > 0}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      {/* ── Live alert banner ────────────────────────────── */}
      {liveNow.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl
          bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600
          text-white shadow-lg shadow-emerald-900/20
          ring-1 ring-emerald-500/30">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm tracking-wide">
              {liveNow.length} Kelas Sedang Berlangsung!
            </p>
            <p className="text-emerald-100 text-xs mt-0.5 truncate">
              {liveNow.map((m) => m.title).join(" · ")}
            </p>
          </div>
          <span className="text-xs font-bold bg-white/20 backdrop-blur-sm
            px-3 py-1.5 rounded-lg ring-1 ring-white/30 flex-shrink-0 tabular-nums">
            {liveNow.length} LIVE
          </span>
        </div>
      )}

      {/* ── 2-Column Dashboard Shell ────────────────────── */}
      <DashboardShell meetings={meetings} teachers={teachers} students={students} />

    </div>
  );
}

