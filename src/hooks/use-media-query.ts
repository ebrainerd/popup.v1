"use client";

import { useSyncExternalStore } from "react";

/**
 * Track a CSS media query with `useSyncExternalStore` so it's SSR-safe (server
 * snapshot is `false`) and updates without cascading effect renders.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True on desktop-width viewports (Tailwind `lg` and up). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
