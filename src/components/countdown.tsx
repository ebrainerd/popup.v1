"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Shared 1-second ticker so every countdown on the page updates together and
// getSnapshot returns a stable cached value (required by useSyncExternalStore).
let current = Date.now();
let interval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (interval === null) {
    interval = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };
}

/** Current time in ms, or null during SSR / first hydration render. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

type Phase = "scheduled" | "open" | "ended";

function diffParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Live countdown. Before `startAt` it counts down to opening; while open it
 * counts down to `endAt`; afterwards it shows "Ended".
 */
export function Countdown({
  startAt,
  endAt,
  className,
  compact = false,
  draft = false,
}: {
  startAt: string;
  endAt: string;
  className?: string;
  compact?: boolean;
  /** When true, labels reflect a draft that will not open until published. */
  draft?: boolean;
}) {
  const now = useNow();

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  if (now === null) {
    return (
      <span className={cn("font-mono tabular-nums text-muted-foreground", className)}>
        --:--:--
      </span>
    );
  }

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  let phase: Phase;
  let target: number;
  if (now < start) {
    phase = "scheduled";
    target = start;
  } else if (now < end) {
    phase = "open";
    target = end;
  } else {
    phase = "ended";
    target = end;
  }

  if (phase === "ended") {
    return (
      <span className={cn("font-semibold text-muted-foreground", className)}>
        {draft ? "Planned window ended" : "Ended"}
      </span>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(target - now);
  const remaining = target - now;
  const urgent = phase === "open" && remaining < 5 * 60 * 1000;
  const low = phase === "open" && remaining < 15 * 60 * 1000;
  const label = draft
    ? phase === "scheduled"
      ? "Planned opens in"
      : "Publish before"
    : phase === "scheduled"
      ? "Opens in"
      : "Closes in";

  // Draft shops never auto-open; during the planned window show close urgency only.
  const colorClass =
    draft || phase !== "open"
      ? "text-muted-foreground"
      : low
        ? "text-live"
        : "text-success";

  const time =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (compact) {
    return (
      <span
        className={cn("font-mono text-sm font-semibold tabular-nums", colorClass, className)}
      >
        {time}
      </span>
    );
  }

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          colorClass,
          urgent && "animate-live-pulse",
        )}
      >
        {time}
      </span>
    </div>
  );
}
