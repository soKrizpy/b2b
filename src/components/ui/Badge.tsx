// src/components/ui/Badge.tsx
// Small role/status chip used in headers and cards.

const VARIANTS = {
  admin:    "bg-violet-100 text-violet-700 ring-violet-200/80 shadow-violet-100 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-500/40",
  teacher:  "bg-sky-100 text-sky-700 ring-sky-200/80 shadow-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-500/30",
  student:  "bg-emerald-100 text-emerald-700 ring-emerald-200/80 shadow-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30",
  success:  "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-500/30",
  warning:  "bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-500/30",
  danger:   "bg-red-50 text-red-600 ring-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-500/30",
  neutral:  "bg-blue-50 text-blue-700 ring-blue-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-500/30",
} as const;

type Variant = keyof typeof VARIANTS;

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold
        ring-1 ring-inset shadow-sm tracking-wide ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
