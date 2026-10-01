// src/components/ui/Button.tsx
// Reusable button with variant and size props.
"use client";

import { type ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary:   "bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 focus-visible:ring-indigo-500 active:scale-[0.97]",
  secondary: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm hover:shadow focus-visible:ring-slate-400 active:scale-[0.97]",
  danger:    "bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-md shadow-red-200 hover:shadow-lg hover:shadow-red-300 focus-visible:ring-red-500 active:scale-[0.97]",
  ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.97]",
  success:   "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-md shadow-emerald-200 hover:shadow-lg focus-visible:ring-emerald-500 active:scale-[0.97]",
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
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150
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
