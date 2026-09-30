'use client';
import { useActionState, useEffect } from 'react';
import { createChallenge, updateChallenge, type ChallengeActionResult } from '../actions';
import type { ChallengeRow } from '@/types/database';

interface Props {
  topicId: number;
  challenge?: ChallengeRow;
  nextOrderIndex?: number;
  onSuccess?: () => void;
}

export function ChallengeForm({ topicId, challenge, nextOrderIndex = 1, onSuccess }: Props) {
  const action = challenge ? updateChallenge : createChallenge;
  const [state, dispatch, pending] = useActionState(action, null);

  useEffect(() => { if (state?.success) onSuccess?.(); }, [state, onSuccess]);

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <input type="hidden" name="topic_id" value={topicId} />
      {challenge && <input type="hidden" name="id" value={challenge.id} />}

      {state && !state.success && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="ch-title" className="text-sm font-medium">Judul Challenge</label>
        <input id="ch-title" name="title" required defaultValue={challenge?.title ?? ''}
          className="border rounded px-3 py-2 text-sm" placeholder="Buat animasi berjalan" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ch-instr" className="text-sm font-medium">Instruksi</label>
        <textarea id="ch-instr" name="instructions" rows={4}
          defaultValue={challenge?.instructions ?? ''}
          className="border rounded px-3 py-2 text-sm resize-y"
          placeholder="Langkah-langkah yang harus dikerjakan siswa..." />
      </div>

      <div className="flex items-center gap-2">
        <input id="ch-file" name="allows_file_upload" type="checkbox" value="true"
          defaultChecked={challenge?.allows_file_upload ?? false}
          className="h-4 w-4" />
        <label htmlFor="ch-file" className="text-sm">Izinkan upload file sebagai bukti</label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ch-order" className="text-sm font-medium">Urutan</label>
        <input id="ch-order" name="order_index" type="number" min={0}
          defaultValue={challenge?.order_index ?? nextOrderIndex}
          className="border rounded px-3 py-2 text-sm w-24" />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded disabled:opacity-50">
          {pending ? 'Menyimpan...' : challenge ? 'Simpan Perubahan' : 'Buat Challenge'}
        </button>
      </div>
    </form>
  );
}
