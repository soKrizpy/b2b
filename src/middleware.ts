// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_PATHS, PROTECTED_PREFIXES, ROLE_DASHBOARD_MAP } from '@/lib/constants';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  createMockSupabaseClient,
  MOCK_SESSION_COOKIE,
  getMockStore,
  getPreviewFallbackSession,
} from '@/lib/supabase/mock';
import type { UserRole } from '@/types/roles';

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect Server Action POST requests in middleware — redirecting a
  // Server Action returns an HTML page to fetchServerAction and causes E394
  // ("An unexpected response was received from the server.").
  // Server Actions perform their own auth checks via requireRole / getAuthUser.
  if (request.headers.has('next-action')) {
    return NextResponse.next();
  }

  // 1. Public-path passthrough
  const isPublicPath = PUBLIC_PATHS.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 2. Supabase session refresh (with iframe-compatible SameSite=None; Secure; Partitioned)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const iframeCookieOpts = {
    path: '/',
    sameSite: 'none' as const,
    secure: true,
    partitioned: true,
  };

  const mockUserId = request.cookies.get(MOCK_SESSION_COOKIE)?.value;
  const hasMockSession = Boolean(
    mockUserId && getMockStore().users.some((u) => u.id === mockUserId)
  );

  const supabase = isSupabaseConfigured() && !hasMockSession
    ? createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request: { headers: requestHeaders },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, {
                  ...options,
                  ...iframeCookieOpts,
                  httpOnly: false,
                })
              );
            },
          },
        }
      )
    : createMockSupabaseClient({
        getCookie: (name) => request.cookies.get(name)?.value,
        setCookie: (name, value) => response.cookies.set(name, value, { ...iframeCookieOpts, httpOnly: false }),
        deleteCookie: (name) => response.cookies.delete({ name, ...iframeCookieOpts }),
      });

  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();

  const fallbackSession = !cookieUser ? getPreviewFallbackSession() : null;
  const user = cookieUser ?? fallbackSession?.user ?? null;

  // 3. If no cookie session is visible in Edge middleware (e.g. browser blocked third-party
  //    cookies inside the preview iframe), pass through with x-pathname so the Node.js
  //    role layouts (/admin, /teacher, /student) verify the session or redirect to /login.
  if (!user) {
    return response;
  }

  // 4. Resolve role from user_metadata, fallback session, b2b_role cookie, or public.profiles
  let userRole: UserRole | null = isValidRole(user.user_metadata?.role)
    ? user.user_metadata.role
    : fallbackSession?.role ?? null;

  if (!userRole) {
    const cookieRole = request.cookies.get('b2b_role')?.value;
    if (isValidRole(cookieRole)) {
      userRole = cookieRole;
    }
  }

  if (!userRole) {
    try {
      const { data: profile } = (await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()) as unknown as { data: { role?: string } | null };
      if (isValidRole(profile?.role)) {
        userRole = profile.role;
      }
    } catch {
      // ignore
    }
  }

  // Final fallback for authenticated Supabase users without metadata yet
  if (!userRole) {
    const email = (user.email ?? '').toLowerCase();
    if (email.endsWith('@student.mylms.app')) userRole = 'student';
    else if (email.startsWith('guru') || email.startsWith('teacher')) userRole = 'teacher';
    else userRole = 'admin';
  }

  // 5. RBAC enforcement
  const matchedEntry = Object.entries(PROTECTED_PREFIXES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );

  if (matchedEntry) {
    const [, requiredRole] = matchedEntry;

    if (userRole !== requiredRole) {
      if (userRole && userRole in ROLE_DASHBOARD_MAP) {
        const ownDashboard = new URL(ROLE_DASHBOARD_MAP[userRole], request.url);
        return NextResponse.redirect(ownDashboard);
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
