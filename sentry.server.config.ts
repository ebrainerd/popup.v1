import * as Sentry from "@sentry/nextjs";

// Server-side error monitoring. No DSN => the SDK initializes as a no-op,
// so this is safe to ship before Sentry is configured.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || "development",
  tracesSampleRate: dsn ? 0.1 : 0,
});
