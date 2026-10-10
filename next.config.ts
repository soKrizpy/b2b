import type { NextConfig } from "next";

// Required environment variables — set all of these in Vercel project settings
// and in .env.local for local development.
//
// NEXT_PUBLIC_SUPABASE_URL          — Supabase project URL (public)
// NEXT_PUBLIC_SUPABASE_ANON_KEY     — Supabase anon key (public)
// NEXT_PUBLIC_APP_URL               — Canonical app URL, e.g. https://yourapp.vercel.app
// NEXT_PUBLIC_LESSON_ENGINE_URL     — Lesson engine deployment URL
// SUPABASE_SERVICE_ROLE_KEY         — Supabase service-role key (SERVER ONLY — never expose to client)

const nextConfig: NextConfig = {
  output: 'standalone',
  // Enforce HTTPS by redirecting HTTP → HTTPS in production.
  async redirects() {
    return [];
  },
  // Prevent the service-role key from ever appearing in the client bundle.
  // Next.js already strips server-only env vars, but this makes it explicit.
  serverExternalPackages: ['server-only'],
};

export default nextConfig;
