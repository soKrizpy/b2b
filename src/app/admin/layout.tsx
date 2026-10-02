// src/app/admin/layout.tsx
// The middleware has already verified:
//   1. The user is authenticated (valid session)
//   2. The user's role is "admin" (from user_metadata in the JWT)
// This layout trusts that and only reads user info for display purposes.
// It does NOT re-validate the role — doing so from a Server Component
// causes a false redirect because user_metadata in a freshly-issued JWT
// may not yet reflect the role stamp written by the signIn Server Action.

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Only guard against a completely missing session (network error, cleared cookies).
  // Role enforcement is done exclusively in middleware.
  if (error || !user) {
    console.log('[AdminLayout] no session — redirecting to login | error:', error?.message);
    redirect("/login");
  }

  console.log('[AdminLayout] user:', user.id, '| user_metadata.role:', user.user_metadata?.role);

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] transition-colors">
      <AppHeader role="admin" fullName={fullName} currentPath={pathname} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-[var(--foreground)]">
        {children}
      </main>
    </div>
  );
}

