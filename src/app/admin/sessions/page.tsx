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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kelola Jadwal</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {upcoming.length} mendatang · {past.length} selesai/terlewat
          </p>
        </div>
        <CreateSessionModal teachers={teachers} students={students} />
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Mendatang
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada jadwal mendatang.</p>
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
            Riwayat
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
