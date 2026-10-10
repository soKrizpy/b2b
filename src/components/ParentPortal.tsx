'use client';
// src/components/ParentPortal.tsx
// Parent / Admin Academic Vault — cryptographic cert display, milestones, financials.

import React, { useState } from 'react';
import { FaIcon } from './common/FaIcon';

interface CertificateItem {
  id: string;
  moduleName: string;
  tier: 'gold' | 'silver' | 'bronze';
  score: number;
  certNumber: string;
  issuedAt: string;
}

interface MilestoneBadge {
  id: string;
  label: string;
  description: string;
  earnedAt: string;
  icon: string;
}

interface ReceiptItem {
  id: string;
  monthYear: string;
  amount: number;
  status: 'paid' | 'sent' | 'draft';
  bankAccount?: string;
}

interface ParentPortalProps {
  studentName?: string;
  certificates?: CertificateItem[];
  milestones?: MilestoneBadge[];
  receipts?: ReceiptItem[];
  projectLinks?: { label: string; url: string; description: string }[];
}

const TIER_MEDAL: Record<string, { medal: string; color: string; bg: string; ring: string }> = {
  gold:   { medal: '🥇', color: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/20',   ring: 'ring-amber-200 dark:ring-amber-500/30' },
  silver: { medal: '🥈', color: 'text-slate-600 dark:text-slate-300',   bg: 'bg-slate-50 dark:bg-slate-800/30',   ring: 'ring-slate-200 dark:ring-white/10' },
  bronze: { medal: '🥉', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', ring: 'ring-orange-200 dark:ring-orange-500/30' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function ParentPortal({
  studentName = 'Budi Santoso',
  certificates = [
    { id: '1', moduleName: 'Scratch Programming Foundations', tier: 'gold',   score: 96, certNumber: 'B2B-0042', issuedAt: '2026-09-01' },
    { id: '2', moduleName: 'Algorithmic Thinking 101',         tier: 'silver', score: 82, certNumber: 'B2B-0051', issuedAt: '2026-09-22' },
  ],
  milestones = [
    { id: '1', label: 'First Code',    description: 'Menyelesaikan misi koding pertama',      earnedAt: '2026-08-10', icon: 'fa-rocket' },
    { id: '2', label: 'Quiz Master',   description: 'Mendapat skor 100% di kuis modul',       earnedAt: '2026-09-01', icon: 'fa-brain' },
    { id: '3', label: 'Streak Hero',   description: 'Login 10 hari berturut-turut',            earnedAt: '2026-09-15', icon: 'fa-fire' },
    { id: '4', label: 'Pet Whisperer', description: 'Pet Companion naik ke Level 5',          earnedAt: '2026-09-22', icon: 'fa-paw'  },
  ],
  receipts = [
    { id: '1', monthYear: 'September 2026', amount: 600000, status: 'paid' },
    { id: '2', monthYear: 'Oktober 2026',   amount: 750000, status: 'sent', bankAccount: 'BCA 1234567890 a/n Bits2Bytes Indonesia' },
  ],
  projectLinks = [
    { label: 'Proyek Animasi Scratch',     url: 'https://scratch.mit.edu/projects/demo1',  description: 'Animasi interaktif karakter robot' },
    { label: 'Game Maze Algorithm',         url: 'https://scratch.mit.edu/projects/demo2',  description: 'Maze solver dengan Scratch blocks'  },
  ],
}: ParentPortalProps) {
  const [activeTab, setActiveTab] = useState<'certs' | 'milestones' | 'receipts' | 'projects'>('certs');

  const TABS = [
    { key: 'certs',      label: 'Sertifikat',  icon: 'fa-shield-halved' },
    { key: 'milestones', label: 'Pencapaian',  icon: 'fa-award' },
    { key: 'receipts',   label: 'Keuangan',    icon: 'fa-file-invoice-dollar' },
    { key: 'projects',   label: 'Proyek',      icon: 'fa-arrow-up-right-from-square' },
  ] as const;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-500/20 backdrop-blur-md text-violet-300 text-xs font-black px-4 py-1.5 rounded-full mb-3 border border-violet-500/30">
              <i className="fa-solid fa-shield-halved text-violet-300 fa-beat-fade text-sm icon-glow-purple" />
              <span>ACADEMIC VAULT — LAPORAN TERVERIFIKASI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Rapor Digital — {studentName}
            </h1>
            <p className="text-slate-300 text-xs mt-1.5">
              Dokumen akademik terenkripsi · Hanya dapat diakses dengan tautan khusus
            </p>
          </div>

          {/* Verified cryptographic auth badge */}
          <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-3.5 text-center">
            <i className="fa-solid fa-shield-halved fa-beat-fade text-emerald-300 text-3xl mb-1.5 block icon-glow-emerald" />
            <p className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">Terverifikasi</p>
            <p className="text-[10px] text-emerald-400/60 mt-0.5">Kriptografi End-to-End</p>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#161622] p-1.5 rounded-2xl ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-sm ${
              activeTab === tab.key ? 'text-white' : 'text-slate-400 group-hover:text-white'
            }`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div>
        {/* Certificates Tab */}
        {activeTab === 'certs' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
              <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-purple-400 fa-beat-fade icon-glow-purple" /> Sertifikat Akademik
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
            </div>

            {certificates.map((cert) => {
              const t = TIER_MEDAL[cert.tier];
              return (
                <div
                  key={cert.id}
                  className={`rounded-3xl ring-1 p-5 sm:p-6 flex items-start gap-5 shadow-sm
                    hover:shadow-md transition-all duration-200 ${t.bg} ${t.ring}`}
                >
                  <span className="text-5xl flex-shrink-0" aria-hidden="true">{t.medal}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-extrabold text-base ${t.color}`}>
                      {cert.tier.charAt(0).toUpperCase() + cert.tier.slice(1)} Certificate
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5 truncate">{cert.moduleName}</p>
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      <span className={`text-2xl font-extrabold tabular-nums ${t.color}`}>
                        {cert.score}<span className="text-sm font-normal opacity-60">/100</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">#{cert.certNumber}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
              <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                <i className="fa-solid fa-award text-amber-300 icon-glow-amber" /> Pencapaian & Milestone
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="group bg-white dark:bg-[#161622] rounded-3xl ring-1 ring-slate-200/80 dark:ring-white/10 p-5 flex items-center gap-4
                    hover:ring-amber-300 dark:hover:ring-amber-500/40 hover:shadow-md transition-all duration-200 cursor-default"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/25 flex items-center justify-center flex-shrink-0
                    text-xl text-amber-300 group-hover:scale-110 transition-transform duration-200">
                    <i className={`fa-solid ${m.icon} fa-hover-bounce`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white">{m.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(m.earnedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts / Financial Tab */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
              <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                <i className="fa-solid fa-file-invoice-dollar text-emerald-400 icon-glow-emerald" /> Riwayat Keuangan
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
            </div>

            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`group bg-white dark:bg-[#161622] rounded-3xl ring-1 overflow-hidden shadow-sm
                  transition-all duration-200 hover:shadow-md
                  ${receipt.status === 'paid'
                    ? 'ring-emerald-200/80 dark:ring-emerald-500/20'
                    : receipt.status === 'sent'
                    ? 'ring-indigo-200/80 dark:ring-indigo-500/20'
                    : 'ring-slate-200/80 dark:ring-white/10'
                  }`}
              >
                {/* Status bar */}
                <div className={`px-5 py-2.5 flex items-center justify-between text-xs font-black
                  ${receipt.status === 'paid'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : receipt.status === 'sent'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <i
                      className={`fa-solid fa-hover-flip ${
                        receipt.status === 'paid'
                          ? 'fa-circle-check text-emerald-400'
                          : receipt.status === 'sent'
                          ? 'fa-file-invoice-dollar text-white'
                          : 'fa-clock text-slate-400'
                      } text-base`}
                    />
                    Tagihan {receipt.monthYear}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full ring-1 text-[10px]
                    ${receipt.status === 'paid'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 ring-emerald-300/50'
                      : receipt.status === 'sent'
                      ? 'bg-white/20 text-white ring-white/30'
                      : 'bg-slate-200 text-slate-500 ring-slate-300/50'
                    }`}
                  >
                    {receipt.status === 'paid' ? 'LUNAS' : receipt.status === 'sent' ? 'BELUM DIBAYAR' : 'DRAFT'}
                  </span>
                </div>

                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {fmt(receipt.amount)}
                  </p>
                  {receipt.status === 'paid' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check" /> Terbayar
                    </span>
                  )}
                </div>

                {receipt.bankAccount && receipt.status === 'sent' && (
                  <div className="px-5 pb-4">
                    <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-500/20 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1.5">Transfer ke:</p>
                      <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 break-all">{receipt.bankAccount}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Project Inspection Links Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
              <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                <i className="fa-solid fa-arrow-up-right-from-square text-cyan-400 icon-glow-cyan" /> Proyek & Karya Siswa
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {projectLinks.map((project, idx) => (
                <a
                  key={idx}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white dark:bg-[#161622] rounded-3xl ring-1 ring-slate-200/80 dark:ring-white/10 p-5
                    flex items-center gap-4 hover:ring-indigo-300 dark:hover:ring-indigo-500/40 hover:shadow-md
                    transition-all duration-200"
                >
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center
                    text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <i className="fa-solid fa-code fa-hover-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{project.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{project.description}</p>
                  </div>
                  {/* Animated launch icon */}
                  <i className="fa-solid fa-arrow-up-right-from-square text-cyan-400 text-sm flex-shrink-0
                    transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 icon-glow-cyan" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
