// src/app/admin/users/page.tsx
// Admin user management — tabbed Siswa / Guru view with add forms.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllStudents, getAllTeachers } from '@/features/users/queries';
import { getAllModules } from '@/features/curriculum/queries';
import { UsersShell } from './UsersShell';

export const metadata: Metadata = { title: 'Kelola Pengguna — Admin Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [students, teachers, allModules] = await Promise.all([
    getAllStudents(),
    getAllTeachers(),
    getAllModules(),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Page header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#7cc62f] mb-1">
          Manajemen Akun
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Pengguna
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {students.length} siswa · {teachers.length} guru terdaftar
        </p>
      </div>

      <Suspense fallback={null}>
        <UsersShell students={students} teachers={teachers} allModules={allModules} />
      </Suspense>
    </div>
  );
}
