'use client';
// src/features/users/components/DeleteUserButton.tsx
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser } from '../actions';

interface Props {
  userId: string;
  role:   'student' | 'teacher';
  name:   string;
}

export function DeleteUserButton({ userId, role, name }: Props) {
  const [pending, start] = useTransition();
  const router           = useRouter();

  const handle = () => {
    if (!confirm(`Hapus akun "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const fd = new FormData();
    fd.append('userId', userId);
    fd.append('role',   role);
    start(async () => { await deleteUser(null, fd); router.refresh(); });
  };

  return (
    <button type="button" onClick={handle} disabled={pending}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
        text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
        ring-1 ring-red-200 dark:ring-red-700/40
        hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 transition-colors">
      {pending ? '…' : 'Hapus'}
    </button>
  );
}
