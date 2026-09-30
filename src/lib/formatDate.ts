// src/lib/formatDate.ts
// Locale-aware date/time formatting helpers (Indonesian locale by default).

const IDN = "id-ID";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(IDN, {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(IDN, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(IDN, { hour: "2-digit", minute: "2-digit" });
}

/** Returns true when the meeting date is in the future. */
export function isUpcoming(iso: string): boolean {
  return new Date(iso) > new Date();
}

/** Returns true when a meeting is currently live (within 90 min of start). */
export function isLive(iso: string): boolean {
  const start = new Date(iso).getTime();
  const now   = Date.now();
  return now >= start && now <= start + 90 * 60 * 1000;
}

/** How many minutes until meeting starts (negative if already started). */
export function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}
