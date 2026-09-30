// src/features/auth/components/SignInErrors.tsx
// Pure stateless component — renders error state from the signIn action.
// Extracted so it can be unit-tested without mocking useActionState.

import type { SignInResult } from "@/features/auth/actions";

interface Props { state: SignInResult | null }

function hasFieldErrors(fields?: Partial<Record<string, string>>): boolean {
  if (!fields) return false;
  return Object.values(fields).some((v) => typeof v === "string" && v.length > 0);
}

export function SignInErrors({ state }: Props) {
  if (!state || state.success) return null;

  const showBanner = !hasFieldErrors(state.fields);

  return (
    <>
      {showBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          <svg className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.25a.75.75 0 01-1.5 0V5zm.75 7a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Field key is now 'identifier' (email OR phone) */}
      {state.fields?.identifier && (
        <p id="identifier-error" className="text-xs text-red-600">{state.fields.identifier}</p>
      )}

      {state.fields?.password && (
        <p id="password-error" className="text-xs text-red-600">{state.fields.password}</p>
      )}
    </>
  );
}
