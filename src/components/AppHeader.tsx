// src/components/AppHeader.tsx
// Shared top navigation bar for all authenticated role layouts.
// Server Component — receives user data as props; sign-out delegated to client.

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import type { UserRole } from "@/types/roles";

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   "Admin",
  teacher: "Guru",
  student: "Siswa",
};

const ROLE_ICON: Record<UserRole, string> = {
  admin:   "⚙️",
  teacher: "📚",
  student: "🎮",
};

const ROLE_NAV: Record<UserRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: "/admin/dashboard",  label: "Dasbor" },
    { href: "/admin/sessions",   label: "Jadwal" },
    { href: "/admin/curriculum", label: "Kurikulum" },
  ],
  teacher: [
    { href: "/teacher/dashboard",   label: "Dasbor" },
    { href: "/teacher/submissions", label: "Submissions" },
  ],
  student: [
    { href: "/student/dashboard", label: "Dasbor" },
    { href: "/student/lessons",   label: "Pelajaran" },
  ],
};

interface AppHeaderProps {
  role: UserRole;
  fullName: string | null;
  currentPath?: string;
}

export function AppHeader({ role, fullName, currentPath }: AppHeaderProps) {
  const navItems = ROLE_NAV[role];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Brand + nav */}
          <div className="flex items-center gap-6">
            <Link href={navItems[0].href} className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <span className="text-lg">🎓</span>
              <span className="hidden sm:inline">Bits2Bytes</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label }) => {
                const active = currentPath?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User info + sign-out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-slate-500">{fullName ?? "–"}</span>
              <Badge variant={role}>
                {ROLE_ICON[role]} {ROLE_LABEL[role]}
              </Badge>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
