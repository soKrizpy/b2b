// src/features/announcements/types.ts
// Data types for Admin Announcement & Banner Management system.

export type AnnouncementTarget = 'all' | 'students' | 'teachers';
export type AnnouncementUrgency = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  target: AnnouncementTarget;
  urgency: AnnouncementUrgency;
  expires_at?: string | null;
  created_at: string;
  is_active: boolean;
}
