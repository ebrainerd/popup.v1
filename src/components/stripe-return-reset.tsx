"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reset scroll/viewport after returning from external Stripe onboarding (common on iOS). */
export function StripeReturnReset({
  redirectTo,
  autoRedirectMs = 6000,
}: {
  redirectTo?: string;
  /** Soft redirect after the user has had time to read the message. */
  autoRedirectMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.body.style.transform = "";
    document.documentElement.style.transform = "";
  }, []);

  useEffect(() => {
    if (!redirectTo || autoRedirectMs <= 0) return;
    const timer = window.setTimeout(() => router.replace(redirectTo), autoRedirectMs);
    return () => window.clearTimeout(timer);
  }, [redirectTo, autoRedirectMs, router]);

  return null;
}
