// src/app/admin/invoices/page.tsx
// Admin invoice management — list, generate, edit, send, mark paid, parent link.
import type { Metadata } from 'next';
import { getInvoicesByMonth } from '@/features/invoices/queries';
import { InvoicesShell } from './InvoicesShell';

export const metadata: Metadata = { title: 'Manajemen Invoice — Admin Bits2Bytes' };
export const dynamic = 'force-dynamic';

function currentMonthYear(): string {
  const d = new Date();
  // Default to previous month (the most common billing month)
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const monthYear = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthYear();

  const invoices = await getInvoicesByMonth(monthYear);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Page header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#7cc62f] mb-1">
          Keuangan
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Invoice
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Tagihan post-paid berbasis kehadiran · {invoices.length} invoice untuk {monthYear}
        </p>
      </div>

      <InvoicesShell invoices={invoices} selectedMonth={monthYear} />
    </div>
  );
}
