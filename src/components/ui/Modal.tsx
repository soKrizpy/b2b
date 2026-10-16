// src/components/ui/Modal.tsx
// Accessible modal dialog with Escape key and backdrop-click dismissal.
"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
        bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        className={`w-full ${SIZE[size]} bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl
          shadow-blue-500/10 dark:shadow-purple-950/40
          border border-blue-400/40 dark:border-purple-500/40
          ring-1 ring-blue-300/30 dark:ring-purple-500/30
          flex flex-col max-h-[92vh] animate-fade-in-up`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
          border-b border-blue-100 dark:border-purple-500/25
          bg-gradient-to-r from-blue-50/60 to-white dark:from-purple-950/40 dark:to-[#0B0F19] rounded-t-2xl">
          <h2 id="modal-title" className="text-base font-bold text-slate-900 dark:text-purple-50 tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-blue-50
              dark:hover:bg-purple-950/50 dark:hover:text-purple-200
              transition-all duration-150 active:scale-95"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 text-slate-800 dark:text-slate-200">{children}</div>
      </div>
    </div>
  );
}
