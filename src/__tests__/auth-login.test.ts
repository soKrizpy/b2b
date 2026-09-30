// src/__tests__/auth-login.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

// ── Mocks (declared before static imports) ───────────────────────────────────

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/features/auth/lib/resolveRole', () => ({
  resolveUserRole: vi.fn(),
}));

// ── Static imports ───────────────────────────────────────────────────────────

import { signInSchema, isPhoneNumber, phoneToEmail, normalisePhone } from '@/features/auth/validation';
import { signIn } from '@/features/auth/actions';
import { SignInErrors } from '@/features/auth/components/SignInErrors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fd(fields: Record<string, string | undefined>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) form.append(k, v);
  }
  return form;
}

const mockAdminClient = {
  auth: { admin: { updateUserById: vi.fn().mockResolvedValue({}) } },
};

function setupSupabaseAuth(user: unknown, error: unknown) {
  (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1a: Phone helper functions
// ─────────────────────────────────────────────────────────────────────────────

describe('phone helpers', () => {
  describe('isPhoneNumber', () => {
    it('recognises 08xx local format', () => {
      expect(isPhoneNumber('081234567890')).toBe(true);
    });

    it('recognises 628xx without plus', () => {
      expect(isPhoneNumber('6281234567890')).toBe(true);
    });

    it('recognises +628xx E.164 format', () => {
      expect(isPhoneNumber('+6281234567890')).toBe(true);
    });

    it('rejects an email address', () => {
      expect(isPhoneNumber('student@b2b.id')).toBe(false);
    });

    it('rejects a short number', () => {
      expect(isPhoneNumber('0812')).toBe(false);
    });

    it('rejects a non-Indonesian mobile prefix', () => {
      expect(isPhoneNumber('021234567')).toBe(false); // landline prefix
    });
  });

  describe('normalisePhone', () => {
    it('strips leading + from E.164', () => {
      expect(normalisePhone('+6281234567890')).toBe('6281234567890');
    });

    it('leaves 628xx unchanged', () => {
      expect(normalisePhone('6281234567890')).toBe('6281234567890');
    });

    it('leaves 08xx unchanged', () => {
      expect(normalisePhone('081234567890')).toBe('081234567890');
    });

    it('strips whitespace', () => {
      expect(normalisePhone('0812 3456 7890')).toBe('081234567890');
    });
  });

  describe('phoneToEmail', () => {
    it('produces the synthetic email used during student account creation', () => {
      expect(phoneToEmail('081234567890')).toBe('081234567890@student.mylms.app');
    });

    it('strips leading + before building email', () => {
      expect(phoneToEmail('+6281234567890')).toBe('6281234567890@student.mylms.app');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1b: signInSchema — Zod rules
// ─────────────────────────────────────────────────────────────────────────────

describe('signInSchema', () => {
  // ── identifier field ───────────────────────────────────────────────────────

  it('rejects empty identifier', () => {
    const r = signInSchema.safeParse({ identifier: '', password: 'abc123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.identifier?.[0]).toMatch(/wajib/i);
  });

  it('rejects a string that is neither a valid email nor a phone number', () => {
    const r = signInSchema.safeParse({ identifier: 'not-valid', password: 'abc123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.identifier?.[0]).toBeTruthy();
  });

  it('accepts a valid email', () => {
    expect(signInSchema.safeParse({ identifier: 'admin@b2b.id', password: 'abc123' }).success).toBe(true);
  });

  it('accepts email with plus-addressing', () => {
    expect(signInSchema.safeParse({ identifier: 'u+tag@school.edu', password: 'abc123' }).success).toBe(true);
  });

  it('accepts Indonesian phone — 08xx local format', () => {
    expect(signInSchema.safeParse({ identifier: '081234567890', password: '123456' }).success).toBe(true);
  });

  it('accepts Indonesian phone — 628xx without plus', () => {
    expect(signInSchema.safeParse({ identifier: '6281234567890', password: '123456' }).success).toBe(true);
  });

  it('accepts Indonesian phone — +628xx E.164 format', () => {
    expect(signInSchema.safeParse({ identifier: '+6281234567890', password: '123456' }).success).toBe(true);
  });

  // ── password field ─────────────────────────────────────────────────────────

  it('rejects empty password', () => {
    const r = signInSchema.safeParse({ identifier: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.password?.[0]).toBeTruthy();
  });

  it('rejects password shorter than 6 characters', () => {
    const r = signInSchema.safeParse({ identifier: 'a@b.com', password: '12345' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.password?.[0]).toMatch(/6/);
  });

  it('accepts a 6-character PIN (student minimum)', () => {
    expect(signInSchema.safeParse({ identifier: '081234567890', password: '123456' }).success).toBe(true);
  });

  it('accepts a long password', () => {
    expect(signInSchema.safeParse({ identifier: 'a@b.com', password: 'x'.repeat(64) }).success).toBe(true);
  });

  // ── redirectTo field ───────────────────────────────────────────────────────

  it('redirectTo is optional — null and undefined both accepted', () => {
    expect(signInSchema.safeParse({ identifier: 'a@b.com', password: 'abc123', redirectTo: null }).success).toBe(true);
    expect(signInSchema.safeParse({ identifier: 'a@b.com', password: 'abc123' }).success).toBe(true);
  });

  it('redirectTo null coerces to undefined in output', () => {
    const r = signInSchema.safeParse({ identifier: 'a@b.com', password: 'abc123', redirectTo: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.redirectTo).toBeUndefined();
  });

  it('redirectTo string passes through', () => {
    const r = signInSchema.safeParse({ identifier: 'a@b.com', password: 'abc123', redirectTo: '/admin/dashboard' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.redirectTo).toBe('/admin/dashboard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: signIn action logic
// ─────────────────────────────────────────────────────────────────────────────

describe('signIn action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockAdminClient);
  });

  // ── Validation errors ──────────────────────────────────────────────────────

  it('returns identifier field error for empty identifier', async () => {
    const result = await signIn(null, fd({ identifier: '', password: 'abc123' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fields?.identifier).toBeTruthy();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    }
  });

  it('returns identifier field error for invalid input (not email or phone)', async () => {
    const result = await signIn(null, fd({ identifier: 'not-valid', password: 'abc123' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fields?.identifier).toBeTruthy();
  });

  it('returns password field error for short password/PIN', async () => {
    const result = await signIn(null, fd({ identifier: 'a@b.com', password: '12345' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fields?.password).toBeTruthy();
  });

  // ── Auth errors ────────────────────────────────────────────────────────────

  it('returns generic error for wrong credentials — no field keys', async () => {
    setupSupabaseAuth(null, { message: 'Invalid login credentials' });
    const result = await signIn(null, fd({ identifier: 'admin@b2b.id', password: 'wrongpw' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/gagal/i);
      expect(result.fields?.identifier).toBeUndefined();
      expect(result.fields?.password).toBeUndefined();
    }
  });

  it('returns "belum dikonfigurasi" error when resolveUserRole returns null', async () => {
    setupSupabaseAuth({ id: 'u1', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await signIn(null, fd({ identifier: 'a@b.com', password: 'abc123' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/belum dikonfigurasi/i);
  });

  // ── Email login redirects ──────────────────────────────────────────────────

  it('redirects admin to /admin/dashboard on successful email login', async () => {
    setupSupabaseAuth({ id: 'u1', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('admin');
    await expect(signIn(null, fd({ identifier: 'admin@b2b.id', password: 'adminpw1' })))
      .rejects.toThrow('REDIRECT:/admin/dashboard');
  });

  it('redirects teacher to /teacher/dashboard on successful email login', async () => {
    setupSupabaseAuth({ id: 'u2', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('teacher');
    await expect(signIn(null, fd({ identifier: 'teacher@b2b.id', password: 'teachpw1' })))
      .rejects.toThrow('REDIRECT:/teacher/dashboard');
  });

  // ── Phone + PIN login (the new student flow) ───────────────────────────────

  it('resolves phone to synthetic email before calling Supabase', async () => {
    let capturedEmail: string | undefined;
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockImplementation(async ({ email }: { email: string }) => {
          capturedEmail = email;
          return { data: { user: null }, error: { message: 'Invalid login credentials' } };
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    });

    await signIn(null, fd({ identifier: '081234567890', password: '123456' }));
    expect(capturedEmail).toBe('081234567890@student.mylms.app');
  });

  it('resolves +628xx E.164 phone to synthetic email (strips leading +)', async () => {
    let capturedEmail: string | undefined;
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockImplementation(async ({ email }: { email: string }) => {
          capturedEmail = email;
          return { data: { user: null }, error: { message: 'Invalid' } };
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    });

    await signIn(null, fd({ identifier: '+6281234567890', password: '123456' }));
    expect(capturedEmail).toBe('6281234567890@student.mylms.app');
  });

  it('redirects student to /student/dashboard on successful phone + PIN login', async () => {
    setupSupabaseAuth({ id: 'u3', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('student');
    await expect(signIn(null, fd({ identifier: '081234567890', password: '123456' })))
      .rejects.toThrow('REDIRECT:/student/dashboard');
  });

  it('returns generic error when phone+PIN credentials are wrong', async () => {
    setupSupabaseAuth(null, { message: 'Invalid login credentials' });
    const result = await signIn(null, fd({ identifier: '081234567890', password: '999999' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/gagal/i);
  });

  // ── redirectTo safety ──────────────────────────────────────────────────────

  it('honours a safe role-scoped redirectTo', async () => {
    setupSupabaseAuth({ id: 'u1', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('admin');
    await expect(signIn(null, fd({ identifier: 'a@b.com', password: 'adminpw1', redirectTo: '/admin/sessions' })))
      .rejects.toThrow('REDIRECT:/admin/sessions');
  });

  it('falls back to role dashboard when redirectTo=/ (the blink-loop bug)', async () => {
    setupSupabaseAuth({ id: 'u1', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('admin');
    await expect(signIn(null, fd({ identifier: 'a@b.com', password: 'adminpw1', redirectTo: '/' })))
      .rejects.toThrow('REDIRECT:/admin/dashboard');
  });

  it('falls back to role dashboard when redirectTo targets a different role', async () => {
    setupSupabaseAuth({ id: 'u3', user_metadata: {} }, null);
    (resolveUserRole as ReturnType<typeof vi.fn>).mockResolvedValue('student');
    await expect(signIn(null, fd({ identifier: '081234567890', password: '123456', redirectTo: '/admin/dashboard' })))
      .rejects.toThrow('REDIRECT:/student/dashboard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: SignInErrors — pure rendering tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SignInErrors rendering', () => {
  afterEach(cleanup);

  function renderErrors(state: Parameters<typeof SignInErrors>[0]['state']) {
    return render(React.createElement(SignInErrors, { state }));
  }

  it('renders nothing when state is null', () => {
    renderErrors(null);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body.textContent?.trim()).toBe('');
  });

  it('renders nothing when state.success is true', () => {
    renderErrors({ success: true, redirectTo: '/admin/dashboard' });
    expect(document.body.textContent?.trim()).toBe('');
  });

  it('shows banner for credential failure (no field errors)', () => {
    renderErrors({ success: false, error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Login gagal');
  });

  it('shows banner for account-not-configured error', () => {
    renderErrors({ success: false, error: 'Akun ini belum dikonfigurasi. Hubungi administrator.' });
    expect(screen.getByRole('alert')).toHaveTextContent('belum dikonfigurasi');
  });

  it('shows inline identifier error — no banner', () => {
    renderErrors({
      success: false,
      error: 'Mohon periksa.',
      fields: { identifier: 'Masukkan email yang valid atau nomor WhatsApp' },
    });
    expect(screen.getByText('Masukkan email yang valid atau nomor WhatsApp')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows inline password error — no banner', () => {
    renderErrors({ success: false, error: 'Mohon periksa.', fields: { password: 'Password atau PIN minimal 6 karakter' } });
    expect(screen.getByText('Password atau PIN minimal 6 karakter')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows both field errors simultaneously — no banner', () => {
    renderErrors({
      success: false,
      error: 'Mohon periksa.',
      fields: {
        identifier: 'Email atau nomor WhatsApp wajib diisi',
        password:   'Password atau PIN minimal 6 karakter',
      },
    });
    expect(screen.getByText('Email atau nomor WhatsApp wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Password atau PIN minimal 6 karakter')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows banner when fields object is empty (no field-level messages)', () => {
    renderErrors({ success: false, error: 'Login gagal.', fields: {} });
    expect(screen.getByRole('alert')).toHaveTextContent('Login gagal');
  });
});
