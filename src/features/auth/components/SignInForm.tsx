// src/features/auth/components/SignInForm.tsx
"use client";

import { useActionState } from "react";
import { signIn, type SignInResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";
import { SignInErrors } from "./SignInErrors";

const initial: SignInResult | null = null;

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  const hasIdentifierError = Boolean(state && !state.success && state.fields?.identifier);
  const hasPasswordError   = Boolean(state && !state.success && state.fields?.password);

  return (
    <form action={action} className="space-y-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {/* All error rendering delegated to the pure SignInErrors component */}
      <SignInErrors state={state} />

      {/* ── Identifier (email OR WhatsApp number) ──────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-identifier" className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Email atau Nomor WhatsApp
        </label>
        <input
          id="signin-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          placeholder="guru@b2b.id atau 08123456789"
          aria-describedby={hasIdentifierError ? "identifier-error" : undefined}
          className={`rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 shadow-sm focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]
            ${hasIdentifierError
              ? "border-red-400 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200 focus:ring-red-400"
              : "border-blue-500/50 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-500 dark:hover:border-zinc-700"
            }`}
        />
      </div>

      {/* ── Password / PIN ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-password" className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Password atau 6 Digit PIN
        </label>
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          aria-describedby={hasPasswordError ? "password-error" : undefined}
          className={`rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 shadow-sm focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]
            ${hasPasswordError
              ? "border-red-400 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200 focus:ring-red-400"
              : "border-blue-500/50 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-500 dark:hover:border-zinc-700"
            }`}
        />
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Button type="submit" loading={pending} className="w-full justify-center py-2.5 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
        Masuk
      </Button>
    </form>
  );
}
