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
import { isUpcoming } from "@/lib/formatDate";

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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dasbor Admin</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {upcoming.length} jadwal mendatang · {past.length} riwayat
          </p>
        </div>
        <CreateSessionModal teachers={teachers} students={students} />
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Jadwal Mendatang
        </h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 px-6 text-center">
            <span className="text-4xl mb-3">📅</span>
            <p className="font-semibold text-slate-700">Belum ada jadwal mendatang</p>
            <p className="mt-1 text-sm text-slate-400">Klik &quot;Buat Jadwal&quot; untuk membuat sesi baru.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Riwayat Kelas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((m) => (
              <SessionCard key={m.id} meeting={m} showStudents />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
