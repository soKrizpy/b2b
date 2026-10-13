'use client';

interface PrintCertificateButtonProps {
  label: string;
}

export function PrintCertificateButton({ label }: PrintCertificateButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={`Unduh sertifikat ${label}`}
      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl
        text-xs font-extrabold text-white
        bg-gradient-to-r from-purple-600 to-indigo-600
        shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02]
        active:scale-95 transition-all duration-150"
    >
      <i className="fa-solid fa-download mr-2 text-xs" /> Unduh Sertifikat PDF
    </button>
  );
}
