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

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[createSupabaseAdminClient] Missing environment variables: ' +
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'This function must only be called from server-side code.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
