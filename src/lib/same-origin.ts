import { getSiteUrl } from "@/lib/env";

/**
 * Best-effort same-origin check for browser-triggered utility endpoints
 * (auto-queue, opening reminders). These routes stay unauthenticated because
 * logged-out viewers legitimately trigger them, but they should not be
 * drive-by callable from other sites. Browsers always attach an Origin
 * header to cross-origin POSTs, so rejecting mismatched origins blocks
 * cross-site abuse; the endpoints remain idempotent regardless.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite && ["same-origin", "same-site", "none"].includes(secFetchSite)) {
    return true;
  }

  if (origin) {
    try {
      const allowed = new URL(getSiteUrl());
      const got = new URL(origin);
      if (got.host === allowed.host) return true;
      // Local dev / preview deployments run on hosts other than the
      // configured production site URL.
      if (got.hostname === "localhost" || got.hostname === "127.0.0.1") return true;
      return false;
    } catch {
      return false;
    }
  }

  // No Origin and no Sec-Fetch-Site: not a browser (e.g. curl). The work
  // behind these endpoints is idempotent and window-guarded, so allow it
  // rather than break older browsers; the check above stops CSRF-style abuse.
  return true;
}
