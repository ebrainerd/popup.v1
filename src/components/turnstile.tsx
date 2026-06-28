"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void;
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileProps = {
  onTokenChange: (token: string | null) => void;
  /** Bump to force a fresh widget (e.g. after a failed submit). */
  resetKey?: number;
};

type LoadState = "loading" | "ready" | "error";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (window.turnstile) {
          resolve();
          return;
        }
        if (Date.now() - started > 15_000) {
          reject(new Error("Turnstile script timeout"));
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const started = Date.now();
      const tick = () => {
        if (window.turnstile) {
          resolve();
          return;
        }
        if (Date.now() - started > 15_000) {
          reject(new Error("Turnstile API timeout"));
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    };
    script.onerror = () => reject(new Error("Turnstile script blocked"));
    document.head.appendChild(script);
  });
}

/**
 * Cloudflare Turnstile (explicit render). Uses a direct script tag + turnstile.ready()
 * because next/script onLoad can fire before window.turnstile exists in production.
 */
export function Turnstile({ onTokenChange, resetKey = 0 }: TurnstileProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    async function mount() {
      setLoadState("loading");
      onTokenChangeRef.current(null);

      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile) return;

        const render = () => {
          if (!containerRef.current || !window.turnstile) return;

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "auto",
            size: "normal",
            callback: (token: string) => {
              onTokenChangeRef.current(token);
              setLoadState("ready");
            },
            "expired-callback": () => onTokenChangeRef.current(null),
            "error-callback": () => {
              onTokenChangeRef.current(null);
              if (!cancelled) setLoadState("error");
            },
          });
        };

        if (window.turnstile.ready) {
          window.turnstile.ready(render);
        } else {
          render();
        }
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }

    void mount();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetKey, retryCount]);

  if (!siteKey) return null;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="flex min-h-[65px] w-full items-center justify-center rounded-md border border-border bg-muted/30"
        aria-label="Captcha verification"
      />
      {loadState === "loading" && (
        <p className="text-center text-xs text-muted-foreground">Loading verification…</p>
      )}
      {loadState === "error" && (
        <div className="space-y-2 text-center text-xs text-live">
          <p>Verification could not load. Try disabling ad blockers, or use Continue with Google.</p>
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => setRetryCount((n) => n + 1)}
          >
            Retry verification
          </button>
        </div>
      )}
    </div>
  );
}
