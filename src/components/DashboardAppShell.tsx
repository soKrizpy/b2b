'use client';
// src/components/DashboardAppShell.tsx
// Responsive global layout for Admin, Teacher, and Student Dashboards:
//   - Desktop: Fixed Left Sidebar (w-64 expanded / w-20 collapsed) with smooth hover-scale & neon glow
//   - Desktop Header: Simplified top bar with Brand/Title, Theme Toggle, Profile & Logout
//   - Mobile: Fixed Bottom Navigation Bar with centered Icon-Only glassmorphism design
//   - Main Content: Dynamic margin-left & bottom padding (pb-24) for zero UI overlap

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Receipt,
  FileCheck2,
  Sparkles,
  Map,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import type { UserRole } from '@/types/roles';

// ── Role Configurations ───────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   'ADMIN',
  teacher: 'GURU',
  student: 'SISWA',
};

const ROLE_PILL_CLASS: Record<UserRole, string> = {
  admin:   'bg-[#7cc62f]/15 text-[#5fa31f] border-emerald-500/30 dark:bg-[#7cc62f]/20 dark:text-[#a3e05a]',
  teacher: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300',
  student: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300',
};

const ROLE_NAV: Record<
  UserRole,
  Array<{ href: string; label: string; icon: React.ElementType }>
> = {
  admin: [
    { href: '/admin/dashboard',  label: 'Dasbor',    icon: LayoutDashboard },
    { href: '/admin/sessions',   label: 'Jadwal',    icon: Calendar },
    { href: '/admin/curriculum', label: 'Kurikulum', icon: BookOpen },
    { href: '/admin/users',      label: 'Pengguna',  icon: Users },
    { href: '/admin/invoices',   label: 'Invoice',   icon: Receipt },
  ],
  teacher: [
    { href: '/teacher/dashboard',   label: 'Dasbor',     icon: LayoutDashboard },
    { href: '/teacher/submissions', label: 'Submissions', icon: FileCheck2 },
  ],
  student: [
    { href: '/student/dashboard',  label: 'Town Square', icon: Sparkles },
    { href: '/student/lessons',    label: 'Quest Map',   icon: Map },
    { href: '/student/parent-hub', label: 'Parent Hub',  icon: HeartHandshake },
  ],
};

interface DashboardAppShellProps {
  role: UserRole;
  fullName: string | null;
  currentPath: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function DashboardAppShell({
  role,
  fullName,
  currentPath,
  children,
  maxWidthClass = 'max-w-7xl',
}: DashboardAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = ROLE_NAV[role];
  const pillClass = ROLE_PILL_CLASS[role];

  // Derive active item label for header display
  const activeItem = useMemo(() => {
    return navItems.find((item) => currentPath.startsWith(item.href)) ?? navItems[0];
  }, [navItems, currentPath]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 flex">
      
      {/* ── 1. Desktop & Laptop Left Sidebar (>= 768px / md) ────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40
          bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl
          border-r border-blue-400/40 dark:border-purple-500/40
          shadow-md dark:shadow-purple-950/20
          transition-all duration-300 ease-in-out ${
            collapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center px-4 border-b border-blue-400/30 dark:border-purple-500/30 justify-between">
          <Link href={navItems[0].href} className="flex items-center gap-3 overflow-hidden">
            <Image
              src="/b2blight.webp"
              alt="bits2bytes"
              width={34}
              height={34}
              className="dark:hidden rounded-lg flex-shrink-0"
              priority
            />
            <Image
              src="/b2bdark.webp"
              alt="bits2bytes"
              width={34}
              height={34}
              className="hidden dark:block rounded-lg flex-shrink-0"
              priority
            />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black tracking-tight leading-none text-slate-900 dark:text-purple-50">
                  bits<span className="text-[#7cc62f]">2</span>bytes
                </span>
                <span className={`text-[9px] font-extrabold tracking-widest uppercase mt-1 px-1.5 py-0.5 rounded-full border self-start ${pillClass}`}>
                  {ROLE_LABEL[role]}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = currentPath.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold
                  transition-all duration-200 ease-out cursor-pointer group hover:scale-[1.02] hover:-translate-y-0.5
                  ${active
                    ? 'bg-blue-500/10 text-blue-700 border border-blue-400/60 shadow-neon-blue dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/60 dark:shadow-neon-purple'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-purple-100 hover:bg-blue-50/50 dark:hover:bg-purple-950/40 border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-blue-600 dark:text-purple-300' : ''}`} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {active && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7cc62f] shadow-sm shadow-[#7cc62f]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Collapse Toggle */}
        <div className="p-3 border-t border-blue-400/30 dark:border-purple-500/30">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold
              bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10
              text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
              hover:border-blue-400/50 dark:hover:border-purple-500/50 transition-all active:scale-95"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Ciutkan Navigasi</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── 2. Header & Main Content Area Wrapper ──────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Header */}
        <header
          className="sticky top-0 z-30 h-16 border-b transition-colors
            bg-white/90 dark:bg-[#020617]/90
            border-blue-400/40 dark:border-purple-500/40
            backdrop-blur-xl shadow-xs"
        >
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile Logo & Desktop Page Title */}
            <div className="flex items-center gap-3">
              {/* Mobile logo */}
              <Link href={navItems[0].href} className="md:hidden flex items-center gap-2">
                <Image
                  src="/b2blight.webp"
                  alt="bits2bytes"
                  width={30}
                  height={30}
                  className="dark:hidden rounded-lg"
                  priority
                />
                <Image
                  src="/b2bdark.webp"
                  alt="bits2bytes"
                  width={30}
                  height={30}
                  className="hidden dark:block rounded-lg"
                  priority
                />
              </Link>
              {/* Active Section Title */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-purple-300/80">
                  {ROLE_LABEL[role]}
                </span>
                <span className="text-xs text-slate-300 dark:text-slate-700">/</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-purple-50">
                  {activeItem.label}
                </span>
              </div>
            </div>

            {/* Right: Theme Toggle + User Pill + SignOut */}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />

              {/* User Profile Pill */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border
                bg-slate-50 border-slate-200 dark:bg-[#0B0F19] dark:border-purple-500/40 shadow-xs">
                <div className="w-5 h-5 rounded-md bg-[#7cc62f] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-black">
                    {(fullName ?? '?')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-purple-100 max-w-[120px] truncate">
                  {fullName ?? '–'}
                </span>
              </div>

              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className={`flex-1 mx-auto w-full ${maxWidthClass} px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12 text-[var(--foreground)]`}
        >
          {children}
        </main>
      </div>

      {/* ── 3. Mobile & Tablet Sticky Bottom Nav Bar (< 768px / md) ───────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16
          bg-white/95 dark:bg-[#020617]/95 backdrop-blur-2xl
          border-t border-blue-400/40 dark:border-purple-500/40
          shadow-[0_-4px_25px_rgba(59,130,246,0.15)] dark:shadow-[0_-4px_25px_rgba(168,85,247,0.3)]
          px-4 flex items-center justify-around gap-1
          pb-[calc(0.25rem+env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation bar"
      >
        {navItems.map((item) => {
          const active = currentPath.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`relative flex items-center justify-center p-2.5 rounded-2xl
                transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-blue-500/10 text-blue-600 border border-blue-400/50 shadow-neon-blue dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/50 dark:shadow-neon-purple scale-105'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-purple-100'
                }`}
            >
              {active && (
                <span className="absolute -top-2.5 w-6 h-1 rounded-full bg-[#7cc62f] shadow-sm shadow-[#7cc62f]" />
              )}
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
