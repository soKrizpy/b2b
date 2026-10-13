// src/app/api/announcements/route.ts
// Server-backed Announcements API (GET, POST, PATCH, DELETE)
// Persists announcements in Supabase `announcements` table (or mock store fallback)
// so Admin announcements are visible across all Teacher and Student devices.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { INITIAL_ANNOUNCEMENTS } from '@/features/announcements/announcementStore';
import type { Announcement } from '@/features/announcements/types';

export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await (db
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Announcement[] | null;
        error: { message: string } | null;
      }>);

    if (error || !data) {
      return NextResponse.json({ announcements: INITIAL_ANNOUNCEMENTS });
    }
    return NextResponse.json({ announcements: data });
  } catch {
    return NextResponse.json({ announcements: INITIAL_ANNOUNCEMENTS });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as Partial<Announcement>;
    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: 'Judul dan isi pengumuman wajib diisi.' }, { status: 400 });
    }

    const newAnn: Announcement = {
      id: body.id ?? `ann-${Date.now()}`,
      title: body.title.trim(),
      content: body.content.trim(),
      image_url: body.image_url?.trim() || null,
      target: body.target ?? 'all',
      urgency: body.urgency ?? 'info',
      expires_at: body.expires_at || null,
      created_at: new Date().toISOString(),
      is_active: body.is_active ?? true,
    };

    const db = createSupabaseAdminClient();
    await (db.from('announcements').insert(newAnn as never) as unknown as Promise<unknown>);

    return NextResponse.json({ announcement: newAnn });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat pengumuman.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as Partial<Announcement> & { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'ID pengumuman wajib diisi.' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const db = createSupabaseAdminClient();
    await (db
      .from('announcements')
      .update(updates as never)
      .eq('id', id) as unknown as Promise<unknown>);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui pengumuman.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID pengumuman wajib diisi.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    await (db.from('announcements').delete().eq('id', id) as unknown as Promise<unknown>);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus pengumuman.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
