/**
 * Open a blank tab synchronously in the click gesture (before any await).
 * Do not pass `noopener` in windowFeatures — that makes `window.open` return
 * null in Chromium while still opening a blank tab.
 */
export function openCheckoutTab(): Window | null {
  if (typeof window === "undefined") return null;
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.opener = null;
    } catch {
      // Ignore — some browsers restrict opener writes.
    }
  }
  return tab;
}

/**
 * Finish Stripe Checkout navigation after a server action resolves.
 * Callers must open `tab` via `openCheckoutTab()` in the click handler.
 */
export function navigateStripeCheckout(tab: Window | null, url: string): boolean {
  if (tab && !tab.closed) {
    tab.location.href = url;
    return true;
  }
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
  return false;
}

/** Close a blank tab opened for checkout when session creation fails. */
export function closeStripeCheckoutTab(tab: Window | null): void {
  try {
    tab?.close();
  } catch {
    // Tab may already be closed or inaccessible.
  }
}
