// src/app/student/parent-hub/page.tsx
// 👨‍👩‍👧 Parent Hub — student progress report (billing moved to Town Square modal).
// Sections:
//   1. Hero header
//   2. 4 Metric cards (attendance, avg quiz, sessions, module status)
//   3. Monthly Graphic Report Card + 12-month archive download
//   4. Riwayat Kelas — nested accordion
//   5. Portofolio Challenge
//   6. Sertifikat
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getStudentHubBundle,
} from '@/features/parent-report/queries.student';
import { TIER_CONFIG } from '@/features/certificates/queries';
import { PrintCertificateButton } from '@/features/certificates/components/PrintCertificateButton';
import { RiwayatAccordion } from '@/features/parent-report/components/RiwayatAccordion';
import { MonthlyReportCard } from '@/features/parent-report/components/MonthlyReportCard';
import { MonthlyQuizChart } from '@/features/parent-report/components/MonthlyQuizChart';
import { formatDate } from '@/lib/formatDate';
import type { PortfolioItem } from '@/features/parent-report/queries.student';
import type { CertificateWithModule } from '@/features/certificates/queries';

export const metadata: Metadata = { title: '👨‍👩‍👧 Parent Hub — Bits2Bytes' };
export const dynamic = 'force-dynamic';

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 via-purple-300/40 to-transparent" />
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500
        whitespace-nowrap flex items-center gap-2">
        <i className={`${icon} text-purple-500`} />
        {label}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-l from-zinc-200 via-purple-300/40 to-transparent" />
    </div>
  );
}

// ── Portfolio section ─────────────────────────────────────────────────────────

function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300
        bg-zinc-50 py-10 text-center">
        <span className="text-4xl mb-2 block select-none">🎨</span>
        <p className="font-bold text-zinc-800 text-sm">Belum Ada Portofolio</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
          Kirimkan challenge dan tunggu persetujuan guru untuk menampilkan karyamu di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.submissionId}
          className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm
            hover:border-cyan-400/60 hover:shadow-md
            transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-2xl select-none">🎨</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5
                rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                ✓ Approved
              </span>
            </div>
            <p className="font-extrabold text-zinc-800 text-sm leading-snug">{item.challengeTitle}</p>
            {item.topicTitle && (
              <p className="text-xs font-semibold text-purple-600 mt-1 truncate">{item.topicTitle}</p>
            )}
            {item.approvedAt && (
              <p className="text-[10px] text-zinc-400 mt-2">
                Disetujui {formatDate(item.approvedAt)}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
            {item.submissionUrl ? (
              <a href={item.submissionUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold
                  text-cyan-600 hover:text-cyan-700 transition-colors">
                Buka Proyek Siswa
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
              </a>
            ) : (
              <span className="text-xs text-zinc-400 italic">Tidak ada link</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Certificate cards ─────────────────────────────────────────────────────────

function CertificateCards({ certs }: { certs: CertificateWithModule[] }) {
  if (certs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300
        bg-zinc-50 py-10 text-center">
        <span className="text-4xl mb-2 block select-none">🎖</span>
        <p className="font-bold text-zinc-800 text-sm">Belum Ada Sertifikat</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Selesaikan modul dan ikuti tryout akhir untuk mendapatkan sertifikatmu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certs.map((cert) => {
        const cfg = TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG];
        return (
          <div key={cert.id}
            className="bg-gradient-to-r from-amber-50 via-white to-purple-50
              border border-amber-200 rounded-2xl p-6 shadow-sm
              flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-4xl select-none">{cfg.medal}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1
                  rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-mono">
                  #{cert.certificate_number}
                </span>
              </div>
              <div className="mt-3">
                <p className={`font-black text-lg ${cfg.color}`}>{cfg.label} Certificate</p>
                {cert.module_title && (
                  <p className="text-sm font-bold text-zinc-800 mt-1 truncate">{cert.module_title}</p>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`text-2xl font-black font-mono tabular-nums ${cfg.color}`}>
                  {cert.score}<span className="text-xs font-normal opacity-60">/100</span>
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(cert.issued_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
              <p className={`text-xs mt-2 ${cfg.color} opacity-80 leading-relaxed`}>
                {cfg.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-amber-100 flex items-center justify-end">
              <PrintCertificateButton label={cfg.label} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ParentHubPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // Fetch unified bundle in 2 parallel batches instead of 18+ sequential round-trips
  const { hubData: hub, snapshots } = await getStudentHubBundle(user.id);

  const { studentName, monthly, portfolio, certificates, riwayat } = hub;
  const totalCompletedSessions = riwayat.reduce((s, m) => s + m.sessions.length, 0);

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden
        bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700
        border border-purple-400/30 p-6 sm:p-8 text-white
        shadow-xl shadow-purple-500/15">
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-200 mb-1
            flex items-center gap-1.5">
            <i className="fa-solid fa-users text-purple-200" /> Parent Hub
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Laporan Perkembangan
          </h1>
          <p className="text-sm text-purple-100 mt-1 font-medium">
            {studentName} · {monthly.monthLabel}
          </p>
        </div>
      </div>

      <section>
        <SectionDivider icon="fa-solid fa-chart-line" label="Ringkasan Bulan Ini" />
        <div className="mt-4">
          <MonthlyReportCard
            snapshots={snapshots}
            studentName={studentName}
            totalCompletedSessions={totalCompletedSessions}
            moduleStatus={monthly.moduleStatus}
            certCount={certificates.length}
          >
            {/* ── Grafik Perbandingan Kuis Bulanan ── */}
            <section>
              <SectionDivider icon="fa-solid fa-chart-column" label="Grafik Kuis Bulanan" />
              <div className="mt-4">
                <MonthlyQuizChart snapshots={snapshots} />
              </div>
            </section>

            {/* ── Riwayat Kelas — injected before archive ── */}
            <section>
              <SectionDivider icon="fa-solid fa-clock-rotate-left" label="Riwayat Kelas" />
              <div className="mt-4">
                <RiwayatAccordion modules={riwayat} />
              </div>
            </section>
          </MonthlyReportCard>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section>
        <SectionDivider icon="fa-solid fa-palette" label="Portofolio Challenge" />
        <div className="mt-4">
          <PortfolioSection items={portfolio} />
        </div>
      </section>

      {/* ── Certificates ── */}
      <section>
        <SectionDivider icon="fa-solid fa-award" label="Sertifikat" />
        <div className="mt-4">
          <CertificateCards certs={certificates} />
        </div>
      </section>
    </div>
  );
}
