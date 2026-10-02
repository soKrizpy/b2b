// src/app/teacher/layout.tsx
// Role enforcement is done exclusively in middleware. This layout only
// checks that a session exists for display purposes.

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('[TeacherLayout] no session — redirecting to login');
    redirect("/login");
  }

  console.log('[TeacherLayout] user:', user.id, '| user_metadata.role:', user.user_metadata?.role);

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] transition-colors">
      <AppHeader role="teacher" fullName={fullName} currentPath={pathname} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8 text-[var(--foreground)]">
        {children}
      </main>
    </div>
  );
}

