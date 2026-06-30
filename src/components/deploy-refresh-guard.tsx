"use client";

import { useEffect } from "react";

function isStaleServerActionError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : String(reason ?? "");
  return (
    message.includes("Server Action") &&
    (message.includes("was not found") ||
      message.includes("failed to find") ||
      message.includes("UnrecognizedActionError"))
  );
}

/**
 * After a deploy, cached client bundles can reference old Server Action IDs.
 * Reload once so users pick up the latest JS instead of a crash page.
 */
export function DeployRefreshGuard() {
  useEffect(() => {
    function maybeReload(reason: unknown) {
      if (!isStaleServerActionError(reason)) return;
      const key = "popup-deploy-reload";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      maybeReload(event.reason);
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return null;
}
