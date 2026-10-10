// src/app/teacher/layout.tsx
// Role enforcement is done exclusively in middleware. This layout checks session
// and delegates rendering to DashboardAppShell with sidebar & mobile bottom bar.

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/DashboardAppShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;

  return (
    <DashboardAppShell role="teacher" fullName={fullName} currentPath={pathname} maxWidthClass="max-w-5xl">
      {children}
    </DashboardAppShell>
  );
}
