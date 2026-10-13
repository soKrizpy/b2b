// src/app/teacher/submissions/page.tsx
// Teacher: review student challenge submissions.
import type { Metadata } from 'next';
import { getAllSubmissions } from '@/features/challenges/queries';
import { TeacherSubmissionsClient } from './TeacherSubmissionsClient';

export const metadata: Metadata = { title: 'Review Submissions — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function TeacherSubmissionsPage() {
  const submissions = await getAllSubmissions();

  return <TeacherSubmissionsClient submissions={submissions} />;
}

