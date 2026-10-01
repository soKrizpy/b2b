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

/** Accent color per role for the active nav indicator */
const ROLE_ACCENT: Record<UserRole, { active: string; indicator: string }> = {
  admin:   { active: "bg-violet-50 text-violet-700",        indicator: "bg-violet-500" },
  teacher: { active: "bg-sky-50    text-sky-700",           indicator: "bg-sky-500" },
  student: { active: "bg-indigo-50 text-indigo-700",        indicator: "bg-indigo-500" },
};

const ROLE_NAV: Record<UserRole, Array<{ href: string; label: string; icon: string }>> = {
  admin: [
    { href: "/admin/dashboard",  label: "Dasbor",    icon: "🏠" },
    { href: "/admin/sessions",   label: "Jadwal",    icon: "📅" },
    { href: "/admin/curriculum", label: "Kurikulum", icon: "📖" },
  ],
  teacher: [
    { href: "/teacher/dashboard",   label: "Dasbor",      icon: "🏠" },
    { href: "/teacher/submissions", label: "Submissions",  icon: "📝" },
  ],
  student: [
    { href: "/student/dashboard", label: "Dasbor",    icon: "🏠" },
    { href: "/student/lessons",   label: "Pelajaran", icon: "📖" },
  ],
};

/** Brand gradient per role */
const ROLE_BRAND_GRADIENT: Record<UserRole, string> = {
  admin:   "from-violet-600 to-purple-700",
  teacher: "from-sky-500   to-blue-700",
  student: "from-indigo-500 to-violet-600",
};

interface AppHeaderProps {
  role: UserRole;
  fullName: string | null;
  currentPath?: string;
}

export function AppHeader({ role, fullName, currentPath }: AppHeaderProps) {
  const navItems = ROLE_NAV[role];
  const accent   = ROLE_ACCENT[role];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl
      border-b border-slate-200/80 shadow-sm shadow-slate-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Brand logo + nav ───────────────────────────── */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              href={navItems[0].href}
              className="flex items-center gap-2.5 group select-none"
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${ROLE_BRAND_GRADIENT[role]}
                flex items-center justify-center shadow-md shadow-indigo-200/60
                group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                <span className="text-sm">🎓</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold text-slate-900 leading-none block">Bits2Bytes</span>
                <span className="text-[10px] text-slate-400 leading-none font-medium uppercase tracking-wider">LMS</span>
              </div>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            {/* Nav items */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label, icon }) => {
                const active = currentPath?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150
                      group flex items-center gap-1.5
                      ${active
                        ? `${accent.active} shadow-sm`
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    {label}
                    {active && (
                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full ${accent.indicator}`} />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── User info + sign-out ───────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User pill (desktop only) */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-1.5
              ring-1 ring-slate-200/80">
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${ROLE_BRAND_GRADIENT[role]}
                flex items-center justify-center flex-shrink-0`}>
                <span className="text-xs">{ROLE_ICON[role]}</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                  {fullName ?? "–"}
                </span>
                <Badge variant={role}>
                  {ROLE_LABEL[role]}
                </Badge>
              </div>
            </div>

            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Mobile nav — scrollable horizontal strip */}
      <div className="sm:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = currentPath?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-150 whitespace-nowrap
                ${active
                  ? `${accent.active} shadow-sm`
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
