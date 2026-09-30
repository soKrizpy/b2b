// src/features/sessions/components/TeacherCompleteAction.tsx
// Teacher action: "Tandai Selesai" button + progress report modal.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSessionComplete } from "@/features/sessions/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

interface Props { meetingId: number; meetingTitle: string }

export function TeacherCompleteAction({ meetingId, meetingTitle }: Props) {
  const router   = useRouter();
  const [open,    setOpen]    = useState(false);
  const [report,  setReport]  = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [pending, start]      = useTransition();

  async function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.append("id", String(meetingId));
    fd.append("progress_report", report);
    fd.append("completion_status", "selesai");

    start(async () => {
      const result = await markSessionComplete(null, fd);
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error);
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ✓ Tandai Selesai
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Laporan Kelas">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Tandai <strong>{meetingTitle}</strong> sebagai selesai dan tambahkan catatan perkembangan siswa.
          </p>
          <Textarea
            label="Catatan Progress"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={5}
            placeholder="Topik yang dipelajari hari ini, perkembangan siswa, catatan untuk orang tua…"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button size="sm" loading={pending} onClick={handleSubmit}>Simpan & Selesaikan</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
