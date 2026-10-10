'use client';
// src/features/announcements/components/AnnouncementManager.tsx
// Admin Announcement Creator & Active Announcement Management Component.

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  AlertCircle,
  Calendar,
  Users,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import type { Announcement, AnnouncementTarget, AnnouncementUrgency } from '../types';
import {
  getStoredAnnouncements,
  saveStoredAnnouncements,
} from '../announcementStore';

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState<AnnouncementTarget>('all');
  const [urgency, setUrgency] = useState<AnnouncementUrgency>('info');
  const [expiresAt, setExpiresAt] = useState('');

  const loadAnnouncements = useCallback(() => {
    setAnnouncements(getStoredAnnouncements());
  }, []);

  useEffect(() => {
    loadAnnouncements();
    window.addEventListener('announcements_updated', loadAnnouncements);
    return () => window.removeEventListener('announcements_updated', loadAnnouncements);
  }, [loadAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setTarget('all');
    setUrgency('info');
    setExpiresAt('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setImageUrl(ann.image_url ?? '');
    setTarget(ann.target);
    setUrgency(ann.urgency);
    setExpiresAt(ann.expires_at ?? '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const list = getStoredAnnouncements();
    if (editingId) {
      const next = list.map((a) =>
        a.id === editingId
          ? {
              ...a,
              title: title.trim(),
              content: content.trim(),
              image_url: imageUrl.trim() || null,
              target,
              urgency,
              expires_at: expiresAt || null,
            }
          : a
      );
      saveStoredAnnouncements(next);
    } else {
      const newAnn: Announcement = {
        id: `ann-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        target,
        urgency,
        expires_at: expiresAt || null,
        created_at: new Date().toISOString(),
        is_active: true,
      };
      saveStoredAnnouncements([newAnn, ...list]);
    }
    resetForm();
  };

  const handleToggleActive = (id: string) => {
    const list = getStoredAnnouncements();
    const next = list.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a));
    saveStoredAnnouncements(next);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;
    const list = getStoredAnnouncements();
    const next = list.filter((a) => a.id !== id);
    saveStoredAnnouncements(next);
  };

  const urgencyConfig = {
    info: {
      label: 'Info',
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
      icon: Info,
    },
    warning: {
      label: 'Peringatan',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
    },
    urgent: {
      label: 'Penting / Urgent',
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      icon: AlertCircle,
    },
  };

  const targetLabels: Record<AnnouncementTarget, string> = {
    all: 'Semua Pengguna',
    students: 'Siswa Sahaja',
    teachers: 'Guru Sahaja',
  };

  return (
    <div className="bg-white dark:bg-[#0B0F19] border border-blue-400/45 dark:border-purple-500/45 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-purple-50">
              Kelola Pengumuman &amp; Banner
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Buat dan siarkan banner informasi ke dasbor Siswa &amp; Guru
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 active:scale-95 shadow-sm ${
            showForm
              ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              <span>Tutup Form</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Buat Pengumuman</span>
            </>
          )}
        </button>
      </div>

      {/* Form Creator / Editor */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              {editingId ? '✏️ Edit Pengumuman' : '📢 Form Pengumuman Baru'}
            </h4>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Judul Pengumuman</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: 🚀 Pembaruan Jadwal Sesi Pembelajaran"
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Isi Pengumuman / Pesan</label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan pesan lengkap pengumuman di sini..."
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Target Audience */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Penerima</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                <option value="all">🌐 Semua Pengguna (Siswa &amp; Guru)</option>
                <option value="students">🎓 Khusus Siswa</option>
                <option value="teachers">📚 Khusus Guru</option>
              </select>
            </div>

            {/* Urgency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tingkat Urgensi</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as AnnouncementUrgency)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                <option value="info">🔵 Info Normal</option>
                <option value="warning">🟡 Peringatan (Warning)</option>
                <option value="urgent">🔴 Penting / Urgent</option>
              </select>
            </div>

            {/* Expiration Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Kadaluarsa (Opsional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">URL Gambar Banner (Opsional)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/banner.png"
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-sm active:scale-95"
            >
              {editingId ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
            </button>
          </div>
        </form>
      )}

      {/* Active List */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Daftar Pengumuman Aktif ({announcements.length})
        </h4>

        {announcements.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            Belum ada pengumuman aktif. Klik &ldquo;Buat Pengumuman&rdquo; di atas untuk menambahkan.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
            {announcements.map((ann) => {
              const ucfg = urgencyConfig[ann.urgency] ?? urgencyConfig.info;
              const UrgencyIcon = ucfg.icon;

              return (
                <div
                  key={ann.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    ann.is_active
                      ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
                      : 'bg-slate-50 dark:bg-white/2 border-slate-100 dark:border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${ucfg.badge}`}>
                      <UrgencyIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {ann.title}
                        </p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${ucfg.badge}`}>
                          {ucfg.label}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {targetLabels[ann.target]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {ann.content}
                      </p>
                      {ann.expires_at && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Kadaluarsa: {ann.expires_at}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ann.id)}
                      title={ann.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        ann.is_active
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {ann.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(ann)}
                      className="p-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
