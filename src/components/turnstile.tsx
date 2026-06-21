"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile captcha. Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the app works before captcha is
 * configured. The implicit widget injects a hidden `cf-turnstile-response`
 * field into the enclosing <form>, which the auth server actions read and pass
 * to Supabase as the captchaToken.
 *
 * To activate: set the site key here AND enable Captcha (Turnstile) with the
 * matching secret in Supabase → Authentication → Settings.
 */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="auto"
        data-size="flexible"
      />
    </>
  );
}
