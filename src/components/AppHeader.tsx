// src/components/AppHeader.tsx
// Shared top navigation bar — bits2bytes branding, dark/light mode, role pill.
// Server Component shell; ThemeToggle and SignOutButton are Client sub-components.

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import type { UserRole } from "@/types/roles";

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   "ADMIN",
  teacher: "GURU",
  student: "SISWA",
};

const ROLE_PILL_CLASS: Record<UserRole, string> = {
  admin:   "bg-[#7cc62f]/15 text-[#5fa31f] ring-[#7cc62f]/40 dark:bg-[#7cc62f]/20 dark:text-[#a3e05a]",
  teacher: "bg-sky-100/80 text-sky-700 ring-sky-300/60 dark:bg-sky-900/30 dark:text-sky-300",
  student: "bg-indigo-100/80 text-indigo-700 ring-indigo-300/60 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const ROLE_ICON: Record<UserRole, string> = {
  admin:   "⚙️",
  teacher: "📚",
  student: "🎮",
};

const ROLE_NAV: Record<UserRole, Array<{ href: string; label: string; icon: string }>> = {
  admin: [
    { href: "/admin/dashboard",  label: "Dasbor",    icon: "🏠" },
    { href: "/admin/sessions",   label: "Jadwal",    icon: "📅" },
    { href: "/admin/curriculum", label: "Kurikulum", icon: "📖" },
    { href: "/admin/users",       label: "Pengguna",   icon: "👥" },
  ],
  teacher: [
    { href: "/teacher/dashboard",   label: "Dasbor",     icon: "🏠" },
    { href: "/teacher/submissions", label: "Submissions", icon: "📝" },
  ],
  student: [
    { href: "/student/dashboard", label: "Dasbor",    icon: "🏠" },
    { href: "/student/lessons",   label: "Pelajaran", icon: "📖" },
  ],
};

const ROLE_ACTIVE: Record<UserRole, string> = {
  admin:   "bg-[#7cc62f]/10 text-slate-900 dark:bg-[#7cc62f]/15 dark:text-white ring-1 ring-[#7cc62f]/30",
  teacher: "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200 ring-1 ring-sky-200/60",
  student: "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 ring-1 ring-indigo-200/60",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  role: UserRole;
  fullName: string | null;
  currentPath?: string;
}

export function AppHeader({ role, fullName, currentPath }: AppHeaderProps) {
  const navItems  = ROLE_NAV[role];
  const pillClass = ROLE_PILL_CLASS[role];
  const activeClass = ROLE_ACTIVE[role];

  return (
    <header
      className="sticky top-0 z-40 border-b transition-colors
        bg-white/90 dark:bg-[#0d0d14]/90
        border-slate-200/80 dark:border-white/8
        backdrop-blur-xl shadow-sm dark:shadow-black/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Brand + role pill + nav ─────────────────────── */}
          <div className="flex items-center gap-5">

            {/* Logo */}
            <Link href={navItems[0].href} className="flex items-center gap-2.5 group flex-shrink-0">
              {/* Light logo — hidden in dark mode */}
              <Image
                src="/b2blight.webp"
                alt="bits2bytes"
                width={36}
                height={36}
                className="dark:hidden rounded-lg"
                priority
              />
              {/* Dark logo — hidden in light mode */}
              <Image
                src="/b2bdark.webp"
                alt="bits2bytes"
                width={36}
                height={36}
                className="hidden dark:block rounded-lg"
                priority
              />
              {/* Brand wordmark */}
              <span className="hidden sm:block text-sm font-black tracking-tight select-none">
                <span className="text-slate-900 dark:text-white">bits</span>
                <span className="text-[#7cc62f]">2</span>
                <span className="text-slate-900 dark:text-white">bytes</span>
              </span>

              {/* Role pill — sits right next to the wordmark */}
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold
                uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 ${pillClass}`}>
                {ROLE_ICON[role]} {ROLE_LABEL[role]}
              </span>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/10" />

            {/* Nav items */}
            <nav className="hidden sm:flex items-center gap-0.5" aria-label="Main navigation">
              {navItems.map(({ href, label, icon }) => {
                const active = currentPath?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3 py-1.5 rounded-xl text-sm font-medium
                      transition-all duration-150 flex items-center gap-1.5
                      ${active
                        ? activeClass
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8"
                      }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    {label}
                    {active && (
                      <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-[#7cc62f]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Right side: theme toggle + user pill + sign-out ─ */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1
              bg-slate-50 ring-slate-200/80
              dark:bg-white/5 dark:ring-white/10">
              <div className="w-5 h-5 rounded-md bg-[#7cc62f] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-white font-bold">
                  {(fullName ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200
                max-w-[120px] truncate">
                {fullName ?? "–"}
              </span>
            </div>

            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="sm:hidden border-t border-slate-100 dark:border-white/8
        px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = currentPath?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5
                rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${active
                  ? `${activeClass}`
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
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

