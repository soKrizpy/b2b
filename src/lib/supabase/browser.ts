// src/lib/supabase/browser.ts
// Browser-only Supabase client — uses the public anon key.
// Safe to import from Client Components.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
