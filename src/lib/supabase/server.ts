// src/lib/supabase/server.ts
// SSR Supabase client — reads/writes session cookies via next/headers.
// Use inside Server Components, Server Actions, and Route Handlers.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  markSupabaseKeyInvalid,
  createMockSupabaseClient,
  MOCK_SESSION_COOKIE,
  getMockStore,
  getPreviewFallbackSession,
  clearPreviewFallbackSession,
} from './mock';
import { createSupabaseAdminClient } from './admin';

export async function createSupabaseServerClient(options?: { forceRealIfConfigured?: boolean }) {
  const cookieStore = await cookies();

  const iframeCookieOpts = {
    path: '/',
    sameSite: 'none' as const,
    secure: true,
    partitioned: true,
  };

  const mockUserId = cookieStore.get(MOCK_SESSION_COOKIE)?.value;
  const hasMockSession = Boolean(
    !options?.forceRealIfConfigured &&
      mockUserId &&
      getMockStore().users.some((u) => u.id === mockUserId)
  );

  const allCookies = cookieStore.getAll();
  const hasRealSbCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  // If browser blocked cookies in cross-origin preview iframe, fall back to active server-side preview session
  if (!options?.forceRealIfConfigured && !hasRealSbCookie && !hasMockSession) {
    const fallback = getPreviewFallbackSession();
    if (fallback) {
      if (fallback.isMock) {
        return createMockSupabaseClient({
          getCookie: (name) =>
            name === MOCK_SESSION_COOKIE ? fallback.user.id : cookieStore.get(name)?.value,
          setCookie: (name, value) => {
            try {
              cookieStore.set(name, value, { ...iframeCookieOpts, httpOnly: false });
            } catch {
              // ignore
            }
          },
          deleteCookie: (name) => {
            if (name === MOCK_SESSION_COOKIE) clearPreviewFallbackSession();
            try {
              cookieStore.delete({ name, ...iframeCookieOpts });
            } catch {
              // ignore
            }
          },
        }) as unknown as ReturnType<typeof createServerClient<Database>>;
      }

      const adminDb = createSupabaseAdminClient();
      return {
        from(table: string) {
          return adminDb.from(table as never);
        },
        auth: {
          async getUser() {
            return { data: { user: fallback.user }, error: null };
          },
          async signOut() {
            clearPreviewFallbackSession();
            return { error: null };
          },
          async updateUser(attrs: { data?: Record<string, unknown> }) {
            if (attrs.data) {
              fallback.user.user_metadata = {
                ...fallback.user.user_metadata,
                ...attrs.data,
              };
            }
            return { data: { user: fallback.user }, error: null };
          },
          async exchangeCodeForSession() {
            return { data: { session: null }, error: null };
          },
        },
      } as unknown as ReturnType<typeof createServerClient<Database>>;
    }
  }

  if (!isSupabaseConfigured() || hasMockSession) {
    return createMockSupabaseClient({
      getCookie: (name) => cookieStore.get(name)?.value,
      setCookie: (name, value) => {
        try {
          cookieStore.set(name, value, { ...iframeCookieOpts, httpOnly: false });
        } catch {
          // ignore in read-only Server Components
        }
      },
      deleteCookie: (name) => {
        try {
          cookieStore.delete({ name, ...iframeCookieOpts });
        } catch {
          // ignore
        }
      },
    }) as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              cookieStore.set(name, value, {
                ...cookieOptions,
                ...iframeCookieOpts,
                httpOnly: false,
              });
            });
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The session will still be refreshed via the middleware.
          }
        },
      },
      global: {
        fetch: async (fetchUrl, fetchOptions) => {
          const res = await fetch(fetchUrl, { ...fetchOptions, cache: 'no-store' });
          if (res.status === 401 || res.status === 403) {
            try {
              const text = await res.clone().text();
              if (text.toLowerCase().includes('invalid api key')) {
                markSupabaseKeyInvalid(anonKey);
              }
            } catch {
              // ignore
            }
          }
          return res;
        },
      },
    }
  );
}
