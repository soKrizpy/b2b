// src/features/sessions/components/AdminSessionActions.tsx
// Client component containing all admin action buttons/modals for a single meeting.
"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { deleteSession, markSessionComplete, type ActionResult } from "@/features/sessions/actions";
import { Modal } from "@/components/ui/Modal";
import { MeetingForm } from "./MeetingForm";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type { MeetingWithStudents, TeacherOption, StudentOption } from "@/features/sessions/queries";

interface AdminSessionActionsProps {
  meeting: MeetingWithStudents;
  teachers: TeacherOption[];
  students: StudentOption[];
}

export function AdminSessionActions({ meeting, teachers, students }: AdminSessionActionsProps) {
  const router   = useRouter();
  const [editOpen,     setEditOpen]     = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteMode,   setDeleteMode]   = useState<"single" | "series">("single");
  const [report,       setReport]       = useState(meeting.progress_report ?? "");
  const [pending,      startTransition] = useTransition();
  const [feedback,     setFeedback]     = useState<string | null>(null);

  const handleSuccess = useCallback(() => {
    setEditOpen(false);
    router.refresh();
  }, [router]);

  async function handleDelete() {
    const fd = new FormData();
    fd.append("id", String(meeting.id));
    fd.append("edit_mode", deleteMode);
    if (meeting.series_id) fd.append("series_id", meeting.series_id);
    fd.append("session_number", String(meeting.session_number));

    startTransition(async () => {
      const result: ActionResult = await deleteSession(null, fd);
      if (result.success) { setDeleteOpen(false); router.refresh(); }
      else setFeedback(result.error);
    });
  }

  async function handleComplete() {
    const fd = new FormData();
    fd.append("id", String(meeting.id));
    fd.append("progress_report", report);
    fd.append("completion_status", "selesai");

    startTransition(async () => {
      const result: ActionResult = await markSessionComplete(null, fd);
      if (result.success) { setCompleteOpen(false); router.refresh(); }
      else setFeedback(result.error);
    });
  }

  if (meeting.is_completed) return null;

  return (
    <>
      {feedback && (
        <div className="w-full text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">{feedback}</div>
      )}

      {/* Edit */}
      <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
        ✏️ Edit
      </Button>

      {/* Complete */}
      <Button variant="secondary" size="sm" onClick={() => setCompleteOpen(true)}>
        ✓ Selesaikan
      </Button>

      {/* Cancel */}
      <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
        🗑 Hapus
      </Button>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Jadwal" size="lg">
        <MeetingForm mode="edit" teachers={teachers} students={students}
          meeting={meeting} onSuccess={handleSuccess} />
      </Modal>

      {/* Complete modal */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Tandai Kelas Selesai">
        <div className="space-y-4">
          <Textarea label="Catatan Progress (laporan untuk orang tua)"
            value={report} onChange={(e) => setReport(e.target.value)}
            rows={4} placeholder="Topik yang dipelajari, perkembangan siswa…"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCompleteOpen(false)}>Batal</Button>
            <Button size="sm" loading={pending} onClick={handleComplete}>Simpan & Selesaikan</Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Hapus Jadwal" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah kamu yakin ingin menghapus jadwal <strong>{meeting.title}</strong>?
          </p>
          {meeting.series_id && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-700">Ini bagian dari seri:</p>
              {(["single", "series"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="_delMode" value={m}
                    checked={deleteMode === m} onChange={() => setDeleteMode(m)} />
                  {m === "single" ? "Hapus hanya sesi ini" : "Hapus sesi ini & selanjutnya"}
                </label>
              ))}
            </div>
          )}
          {feedback && <p className="text-xs text-red-600">{feedback}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="danger" size="sm" loading={pending} onClick={handleDelete}>Ya, Hapus</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
