import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHost: string | undefined;
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
} catch {
  supabaseHost = undefined;
}

// Baseline security headers (safe in all environments).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow camera/mic on this origin for PopUp Live (seller preview + go-live).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Content Security Policy. Applied in production only — `next dev` (HMR) needs
// eval + websockets that a strict policy would block. This is a pragmatic CSP:
// it uses 'unsafe-inline' (Next injects inline hydration scripts/styles without
// a nonce), but locks down connect/frame/object/base to known integrations:
// Supabase (REST + realtime ws), Sentry, Cloudflare Turnstile, and YouTube/Twitch
// embeds. A nonce-based strict CSP is a future hardening step.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://*.ingest.sentry.io https://*.sentry.io https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://*.twitch.tv",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
].join("; ");

const headers =
  process.env.NODE_ENV === "production"
    ? [...securityHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : securityHeaders;

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers }];
  },
  images: {
    remotePatterns: [
      // Supabase Storage public objects — match the configured project host and,
      // as a robust fallback (e.g. if the build-time env is absent), any
      // *.supabase.co storage path.
      ...(supabaseHost
        ? [
            {
              protocol: (supabaseUrl?.startsWith("http://") ? "http" : "https") as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https" as const,
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // OAuth provider avatars (Google, GitHub) + placeholder content.
      { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
      { protocol: "https" as const, hostname: "avatars.githubusercontent.com" },
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
