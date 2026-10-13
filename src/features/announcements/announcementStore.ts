// src/features/announcements/announcementStore.ts
// Server-synced announcement store with localStorage cache & per-device dismissal persistence.

import type { Announcement } from './types';

const STORAGE_KEY = 'b2b_announcements_v2';
const DISMISSED_KEY = 'b2b_dismissed_announcements_v2';

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '🚀 Pembaruan Platform Bits2Bytes',
    content: 'Selamat datang di antarmuka baru Bits2Bytes! Nikmati navigasi cepat, jadwal kelas otomatis, dan pemantauan invoice transparan.',
    target: 'all',
    urgency: 'info',
    created_at: new Date().toISOString(),
    is_active: true,
  },
  {
    id: 'ann-2',
    title: '⚠️ Pengingat Jadwal Kelas & Presensi',
    content: 'Untuk para Guru dan Siswa, harap pastikan hadir tepat waktu sesuai jam sesi dan melakukan check-in presensi.',
    target: 'all',
    urgency: 'warning',
    created_at: new Date().toISOString(),
    is_active: true,
  },
];

export function getStoredAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return INITIAL_ANNOUNCEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    return JSON.parse(raw) as Announcement[];
  } catch {
    return INITIAL_ANNOUNCEMENTS;
  }
}

export function saveStoredAnnouncements(list: Announcement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('announcements_updated'));
  } catch (err) {
    console.error('Failed to save announcements:', err);
  }
}

/**
 * Fetches announcements from `/api/announcements` and updates the local cache.
 */
export async function fetchServerAnnouncements(): Promise<Announcement[]> {
  if (typeof window === 'undefined') return INITIAL_ANNOUNCEMENTS;
  try {
    const res = await fetch('/api/announcements', { cache: 'no-store' });
    if (!res.ok) return getStoredAnnouncements();
    const data = (await res.json()) as { announcements?: Announcement[] };
    if (Array.isArray(data.announcements) && data.announcements.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.announcements));
      return data.announcements;
    }
    return getStoredAnnouncements();
  } catch {
    return getStoredAnnouncements();
  }
}

export function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function dismissAnnouncementId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDismissedIds();
    if (!current.includes(id)) {
      const next = [...current, id];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('announcements_updated'));
    }
  } catch (err) {
    console.error('Failed to dismiss announcement:', err);
  }
}
