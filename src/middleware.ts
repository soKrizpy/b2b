// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_PATHS, PROTECTED_PREFIXES, ROLE_DASHBOARD_MAP } from '@/lib/constants';
import type { UserRole } from '@/types/roles';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public-path passthrough
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. Supabase session refresh
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── DIAGNOSTIC LOG ──────────────────────────────────────────────────────────
  const userRole = (user?.user_metadata?.role as UserRole | undefined) ?? null;
  console.log(
    '[middleware]', pathname,
    '→ userId:', user?.id ?? 'NONE',
    '| role in JWT:', userRole ?? 'NONE'
  );
  // ───────────────────────────────────────────────────────────────────────────

  // 3. Unauthenticated redirect
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    console.log('[middleware] no session — redirecting to', loginUrl.pathname + loginUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 4. RBAC enforcement
  const matchedEntry = Object.entries(PROTECTED_PREFIXES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );

  if (matchedEntry) {
    const [, requiredRole] = matchedEntry;

    if (userRole !== requiredRole) {
      console.warn(
        '[middleware] RBAC mismatch — path needs', requiredRole,
        'but JWT has', userRole ?? 'NONE',
        '— bouncing user', user.id
      );
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
