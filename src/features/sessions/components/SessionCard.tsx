// src/features/sessions/components/SessionCard.tsx
// Read-only card displaying one meeting's core info.
// Used across all three role dashboards.

import { formatDateTime } from "@/lib/formatDate";
import { isLive, isUpcoming } from "@/lib/formatDate";
import { Badge } from "@/components/ui/Badge";
import type { MeetingWithStudents } from "@/features/sessions/queries";

interface SessionCardProps {
  meeting: MeetingWithStudents;
  /** Slot for role-specific action buttons (Join, Edit, Cancel, Complete…) */
  actions?: React.ReactNode;
  /** Whether to show enrolled student chips */
  showStudents?: boolean;
}

export function SessionCard({ meeting, actions, showStudents = false }: SessionCardProps) {
  const live     = isLive(meeting.meeting_date);
  const upcoming = isUpcoming(meeting.meeting_date);
  const done     = meeting.is_completed;

  const statusBadge = done
    ? <Badge variant="success">✓ Selesai</Badge>
    : live
    ? <Badge variant="danger">● LIVE</Badge>
    : upcoming
    ? <Badge variant="neutral">Mendatang</Badge>
    : <Badge variant="warning">Terlewat</Badge>;

  return (
    <div className={`bg-white rounded-xl ring-1 shadow-sm transition-shadow hover:shadow-md
      ${live ? "ring-red-300 shadow-red-100" : done ? "ring-slate-200 opacity-80" : "ring-slate-200"}`}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {meeting.session_count > 1 && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-indigo-200">
                Sesi {meeting.session_number}/{meeting.session_count}
              </span>
            )}
            {statusBadge}
          </div>
          <h3 className="mt-1.5 font-semibold text-slate-900 text-sm leading-snug truncate">
            {meeting.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(meeting.meeting_date)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-3 space-y-2.5">
        {/* Meeting link */}
        {meeting.link_url && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 8.72a.75.75 0 001.06 1.06l1.69-1.69a3 3 0 000-4.24l-.69-.69a3 3 0 00-4.24 0l-.69.69a3 3 0 000 4.24l.75.75a.75.75 0 001.06-1.06l-.75-.75a1.5 1.5 0 010-2.12l.69-.69a1.5 1.5 0 012.12 0l.69.69a1.5 1.5 0 010 2.12l-1.69 1.69z"/>
              <path d="M9.78 7.28a.75.75 0 00-1.06-1.06l-1.69 1.69a3 3 0 000 4.24l.69.69a3 3 0 004.24 0l.69-.69a3 3 0 000-4.24l-.75-.75a.75.75 0 00-1.06 1.06l.75.75a1.5 1.5 0 010 2.12l-.69.69a1.5 1.5 0 01-2.12 0l-.69-.69a1.5 1.5 0 010-2.12l1.69-1.69z"/>
            </svg>
            <span className="truncate">{meeting.link_url}</span>
          </div>
        )}

        {/* Notes */}
        {meeting.notes && (
          <p className="text-xs text-slate-500 italic line-clamp-2">{meeting.notes}</p>
        )}

        {/* Students */}
        {showStudents && meeting.meeting_students.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meeting.meeting_students.map((ms) => (
              <span
                key={ms.student_id}
                className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {ms.students?.full_name ?? "–"}
              </span>
            ))}
          </div>
        )}

        {/* Progress report (completed meetings) */}
        {done && meeting.progress_report && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 border border-slate-200">
            <span className="font-medium text-slate-700">Catatan: </span>
            {meeting.progress_report}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {actions && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
