// src/features/auth/validation.ts
import { z } from 'zod';

// ── Phone number helpers ──────────────────────────────────────────────────────
// Indonesian phone formats stored in public.students.email_or_phone:
//   08xxxxxxxxxx   (local format)
//   628xxxxxxxxxx  (international without +)
//   +628xxxxxxxxxx (E.164)
// During account creation, the phone is converted to a synthetic email:
//   {phone}@student.mylms.app
// We normalise all formats to the bare number before building that email.

const PHONE_REGEX = /^(\+?62|0)8\d{7,12}$/;

export function isPhoneNumber(value: string): boolean {
  return PHONE_REGEX.test(value.replace(/\s/g, ''));
}

/**
 * Normalises any Indonesian phone format to the bare number used as the
 * email_or_phone key stored in public.students.
 *
 *   +6281234567890 → 6281234567890
 *   081234567890   → 081234567890
 *   628xxx         → 628xxx
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\s/g, '').replace(/^\+/, '');
  return digits;
}

/**
 * Converts a phone number to the synthetic email used by Supabase Auth for
 * student accounts.  Matches the format used in the admin student creation
 * route: `${contact}@student.mylms.app`
 */
export function phoneToEmail(phone: string): string {
  return `${normalisePhone(phone)}@student.mylms.app`;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  // Accepts:  valid email  OR  Indonesian phone number
  identifier: z
    .string()
    .min(1, 'Email atau nomor WhatsApp wajib diisi')
    .refine(
      (v) => v.includes('@') || isPhoneNumber(v),
      'Masukkan email yang valid atau nomor WhatsApp (contoh: 08123456789)'
    ),

  // min 6 to accommodate 6-digit PINs; no upper bound
  password: z.string().min(6, 'Password atau PIN minimal 6 karakter'),

  // From hidden input — may be null when input is absent
  redirectTo: z.string().nullish().transform((v) => v ?? undefined),
});

export type SignInInput = z.infer<typeof signInSchema>;
