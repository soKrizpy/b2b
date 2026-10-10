// src/features/certificates/queries.ts
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { CertificateRow, CertificateTier } from '@/types/database';

export interface CertificateWithModule extends CertificateRow {
  module_title: string | null;
}

export const TIER_CONFIG: Record<CertificateTier, {
  label: string; color: string; bg: string; ring: string; medal: string; description: string;
}> = {
  achievement: {
    label:       'Achievement',
    medal:       '🥇',
    description: 'Skor tertinggi — penguasaan luar biasa!',
    color:       'text-amber-700 dark:text-amber-300',
    bg:          'bg-amber-50 dark:bg-amber-900/30',
    ring:        'ring-amber-300 dark:ring-amber-600/60',
  },
  excellent: {
    label:       'Excellent',
    medal:       '🥈',
    description: 'Skor sangat baik — kerja keras terbayar!',
    color:       'text-slate-600 dark:text-slate-300',
    bg:          'bg-slate-50 dark:bg-slate-800/40',
    ring:        'ring-slate-300 dark:ring-slate-600/60',
  },
  completion: {
    label:       'Completion',
    medal:       '🥉',
    description: 'Modul selesai — terus semangat belajar!',
    color:       'text-orange-700 dark:text-orange-300',
    bg:          'bg-orange-50 dark:bg-orange-900/20',
    ring:        'ring-orange-300 dark:ring-orange-600/60',
  },
};

export async function getStudentCertificates(studentId: string): Promise<CertificateWithModule[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at, modules(title)')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) { console.error('[getStudentCertificates]', error.message); return []; }

  return (data ?? []).map((row: unknown) => {
    const r = row as CertificateRow & { modules: { title: string } | null };
    return { ...r, module_title: r.modules?.title ?? null };
  });
}

export async function getCertificateByModuleAndStudent(
  studentId: string, moduleId: number
): Promise<CertificateRow | null> {
  const db = createSupabaseAdminClient();
  const { data } = await (db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at')
    .eq('student_id', studentId)
    .eq('module_id', moduleId)
    .maybeSingle() as unknown as Promise<{ data: CertificateRow | null; error: unknown }>);
  return data;
}
