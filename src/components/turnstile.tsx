"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
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
  resetKey?: number;
};

type LoadState = "loading" | "ready" | "error";

function apiReady(): boolean {
  return typeof window.turnstile?.render === "function";
}

function waitForTurnstileApi(timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (apiReady()) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Turnstile API timeout"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (apiReady()) return Promise.resolve();
    return waitForTurnstileApi();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      waitForTurnstileApi()
        .then(resolve)
        .catch(reject);
    };
    script.onerror = () => reject(new Error("Turnstile script blocked"));
    document.head.appendChild(script);
  });
}

function removeTurnstileScript() {
  document.getElementById(TURNSTILE_SCRIPT_ID)?.remove();
  delete window.turnstile;
}

/**
 * Cloudflare Turnstile (explicit render). Never call turnstile.ready() before the
 * api.js script has fully loaded — that breaks the widget (Cloudflare console warning).
 */
export function Turnstile({ onTokenChange, resetKey = 0 }: TurnstileProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    async function mount() {
      setLoadState("loading");
      onTokenChangeRef.current(null);

      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !apiReady()) return;

        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile!.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "normal",
          callback: (token: string) => {
            onTokenChangeRef.current(token);
            if (!cancelled) setLoadState("ready");
          },
          "expired-callback": () => onTokenChangeRef.current(null),
          "error-callback": (code?: string) => {
            onTokenChangeRef.current(null);
            if (!cancelled) {
              setErrorCode(code ?? null);
              setLoadState("error");
            }
          },
        });
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
          {errorCode === "110200" ? (
            <p>
              This domain is not authorized for Turnstile yet. In the{" "}
              <strong>Cloudflare dashboard → Turnstile → your widget → Hostname Management</strong>,
              add both <strong>popupdrop.co</strong> and <strong>www.popupdrop.co</strong>, save,
              then click Retry below.
            </p>
          ) : (
            <p>
              Verification could not load{errorCode ? ` (error ${errorCode})` : ""}. Disable ad
              blockers, confirm Turnstile hostnames include this site, or use Continue with Google.
            </p>
          )}
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => {
              removeTurnstileScript();
              setRetryCount((n) => n + 1);
            }}
          >
            Retry verification
          </button>
        </div>
      )}
    </div>
  );
}
