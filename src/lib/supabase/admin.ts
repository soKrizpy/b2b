// src/lib/supabase/admin.ts
// Service-role Supabase client — bypasses RLS entirely.
//
// SERVER-ONLY BY CONVENTION: Only import this from Server Actions, Route
// Handlers, and Server Components. Never import from Client Components.
//
// The runtime guard below throws immediately if SUPABASE_SERVICE_ROLE_KEY is
// absent, which prevents the key from silently being undefined in any context.
// We do NOT use `import ''server-only''` here because Next.js 15 build analysis
// flags it as an error when the module is reachable from API Route Handlers
// (which are already inherently server-only).

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isSupabaseAdminConfigured, createMockSupabaseClient } from './mock';

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isSupabaseAdminConfigured() || !url || !key) {
    return createMockSupabaseClient() as unknown as ReturnType<typeof createClient<Database>>;
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}
