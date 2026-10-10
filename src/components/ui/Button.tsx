// src/components/ui/Button.tsx
// Reusable button with electric blue light mode & purple neon dark mode variants.
"use client";

import { type ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary:   "bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 dark:from-purple-600 dark:via-indigo-600 dark:to-purple-700 dark:hover:from-purple-500 dark:hover:to-indigo-600 dark:shadow-purple-500/20 dark:hover:shadow-purple-500/40 focus-visible:ring-blue-500 dark:focus-visible:ring-purple-500 active:scale-[0.97]",
  secondary: "bg-white dark:bg-slate-900/90 hover:bg-blue-50/50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-purple-100 border border-blue-500/50 dark:border-purple-500/40 hover:border-blue-500 dark:hover:border-purple-400 shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] focus-visible:ring-blue-500 dark:focus-visible:ring-purple-500 active:scale-[0.97]",
  danger:    "bg-gradient-to-br from-red-500 to-rose-700 hover:from-red-600 hover:to-rose-800 text-white shadow-md shadow-red-200 dark:shadow-red-950/40 hover:shadow-lg focus-visible:ring-red-500 active:scale-[0.97]",
  ghost:     "text-slate-600 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-purple-950/40 hover:text-blue-600 dark:hover:text-purple-300 active:scale-[0.97]",
  success:   "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-950/40 hover:shadow-lg focus-visible:ring-emerald-500 active:scale-[0.97]",
} as const;

const SIZES = {
  xs: "px-2.5 py-1   text-xs  rounded-lg",
  sm: "px-3   py-1.5 text-xs  rounded-lg",
  md: "px-4   py-2   text-sm  rounded-xl",
  lg: "px-5   py-2.5 text-base rounded-xl",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}
