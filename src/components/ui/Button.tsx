// src/components/ui/Button.tsx
// Reusable button with variant and size props.
"use client";

import { type ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary:   "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus-visible:ring-indigo-500",
  secondary: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-300 shadow-sm focus-visible:ring-slate-400",
  danger:    "bg-red-600   hover:bg-red-700   text-white shadow-sm focus-visible:ring-red-500",
  ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
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
