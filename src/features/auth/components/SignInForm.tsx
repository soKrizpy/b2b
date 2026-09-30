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
      <div className="flex flex-col gap-1">
        <label htmlFor="signin-identifier" className="text-sm font-medium text-slate-700">
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
          className={`rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors
            ${hasIdentifierError ? "border-red-400 bg-red-50" : "border-slate-300"}`}
        />
      </div>

      {/* ── Password / PIN ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label htmlFor="signin-password" className="text-sm font-medium text-slate-700">
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
          className={`rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors
            ${hasPasswordError ? "border-red-400 bg-red-50" : "border-slate-300"}`}
        />
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Button type="submit" loading={pending} className="w-full justify-center py-2.5">
        Masuk
      </Button>
    </form>
  );
}
