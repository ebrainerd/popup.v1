import * as Sentry from "@sentry/nextjs";

// Browser-side error monitoring. No DSN => no-op.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_APP_ENV || "development",
  tracesSampleRate: dsn ? 0.1 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: dsn ? 1.0 : 0,
  // Ephemeral client network noise (esp. Mobile Safari "Load failed" when a
  // tab backgrounds or navigates mid-fetch). Real app bugs still report.
  ignoreErrors: [
    "Load failed",
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "The Internet connection appears to be offline.",
    "cancelled",
    "AbortError",
  ],
});

// Instruments client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
