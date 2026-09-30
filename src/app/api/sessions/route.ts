// src/app/api/sessions/route.ts
// GET  /api/sessions — list meetings scoped to the authenticated user's role
// POST /api/sessions — create meeting(s) — admin only

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiError, apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/errors';
import { validate, createSessionSchema } from '@/features/sessions/validation';
import {
  getSessionsForAdmin,
  getSessionsForTeacher,
  getSessionsForStudent,
} from '@/features/sessions/queries';

type CreateInput = z.infer<typeof createSessionSchema>;

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<Response> {
  const auth = await getAuthUser();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  try {
    let sessions;
    if (auth.role === 'admin') {
      sessions = await getSessionsForAdmin();
    } else if (auth.role === 'teacher') {
      sessions = await getSessionsForTeacher(auth.user.id);
    } else {
      sessions = await getSessionsForStudent(auth.user.id);
    }
    return Response.json(sessions, { headers: NO_STORE });
  } catch (err) {
    return apiInternalError(String(err));
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Request body harus berformat JSON.');
  }

  const v = validate(createSessionSchema, body);
  if (!v.success) return apiError(422, v.error, v.fields, 'VALIDATION_ERROR');

  const { title, meeting_date, link_url, notes, session_count, student_ids } =
    v.data as CreateInput;

  const db = createSupabaseAdminClient();
  const seriesId = session_count > 1 ? crypto.randomUUID() : null;
  const baseDate  = new Date(meeting_date);
  const inserted: number[] = [];

  for (let i = 0; i < session_count; i++) {
    const sessionDate = new Date(baseDate);
    sessionDate.setDate(sessionDate.getDate() + i * 7);

    const { data: meeting, error: insertErr } = await (db
      .from('meetings')
      .insert({
        title,
        meeting_date:   sessionDate.toISOString(),
        link_url:       link_url ?? null,
        notes:          notes    ?? null,
        session_count,
        session_number: i + 1,
        series_id:      seriesId,
      } as never)
      .select('id')
      .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);

    if (insertErr || !meeting) {
      console.error('[POST /api/sessions] insert error:', insertErr?.message);
      continue;
    }

    if (student_ids.length > 0) {
      const rows = student_ids.map((sid: string) => ({
        meeting_id: meeting.id,
        student_id: sid,
      }));
      const { error: assignErr } = await (db
        .from('meeting_students')
        .insert(rows as never) as unknown as Promise<{ error: { message: string } | null }>);
      if (assignErr) console.error('[POST /api/sessions] assign error:', assignErr.message);
    }

    inserted.push(meeting.id);
  }

  if (inserted.length === 0) {
    return apiInternalError('No meeting rows inserted');
  }

  revalidatePath('/admin/sessions', 'layout');
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/student/dashboard', 'layout');

  return Response.json(
    { success: true, ids: inserted, message: `${inserted.length} jadwal berhasil dibuat.` },
    { status: 201, headers: NO_STORE }
  );
}
