// src/components/ui/Badge.tsx
// Small role/status chip used in headers and cards.

const VARIANTS = {
  admin:    "bg-violet-100 text-violet-700 ring-violet-200/80 shadow-violet-100",
  teacher:  "bg-sky-100   text-sky-700   ring-sky-200/80   shadow-sky-100",
  student:  "bg-emerald-100 text-emerald-700 ring-emerald-200/80 shadow-emerald-100",
  success:  "bg-emerald-50  text-emerald-700 ring-emerald-200/80",
  warning:  "bg-amber-50   text-amber-700  ring-amber-200/80",
  danger:   "bg-red-50     text-red-600    ring-red-200/80",
  neutral:  "bg-slate-100  text-slate-600  ring-slate-200/80",
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
