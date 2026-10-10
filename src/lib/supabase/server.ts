// src/lib/supabase/server.ts
// SSR Supabase client — reads/writes session cookies via next/headers.
// Use inside Server Components, Server Actions, and Route Handlers.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { isSupabaseConfigured, createMockSupabaseClient } from './mock';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!isSupabaseConfigured()) {
    return createMockSupabaseClient({
      getCookie: (name) => cookieStore.get(name)?.value,
      setCookie: (name, value) => {
        try {
          cookieStore.set(name, value, { path: '/', httpOnly: false, sameSite: 'lax' });
        } catch {
          // ignore in read-only Server Components
        }
      },
      deleteCookie: (name) => {
        try {
          cookieStore.delete(name);
        } catch {
          // ignore
        }
      },
    }) as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The session will still be refreshed via the middleware.
          }
        },
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
