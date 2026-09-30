// src/app/login/page.tsx
// Public sign-in page. Unauthenticated users are redirected here by middleware.
// Next.js 15: searchParams is a Promise.
import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = { title: "Masuk — Bits2Bytes LMS" };

type Props = { searchParams: Promise<{ redirectTo?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <span className="text-2xl">🎮</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Bits2Bytes LMS</h1>
          <p className="mt-1 text-sm text-slate-500">Platform Belajar Coding Terstruktur</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Masuk ke Akun</h2>
          <SignInForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Belum punya akun? Hubungi administrator.
        </p>
      </div>
    </main>
  );
}
