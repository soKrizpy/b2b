// src/components/ui/Badge.tsx
// Small role/status chip used in headers and cards.

const VARIANTS = {
  admin:    "bg-violet-100 text-violet-800 ring-violet-200",
  teacher:  "bg-sky-100   text-sky-800   ring-sky-200",
  student:  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  success:  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  warning:  "bg-amber-100  text-amber-700  ring-amber-200",
  danger:   "bg-red-100    text-red-700    ring-red-200",
  neutral:  "bg-slate-100  text-slate-700  ring-slate-200",
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
