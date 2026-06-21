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
});

// Instruments client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
