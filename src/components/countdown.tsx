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
function useNow(): number | null {
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
}: {
  startAt: string;
  endAt: string;
  className?: string;
  compact?: boolean;
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
      <span className={cn("font-semibold text-muted-foreground", className)}>Ended</span>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(target - now);
  const urgent = phase === "open" && target - now < 5 * 60 * 1000;
  const label = phase === "scheduled" ? "Opens in" : "Closes in";

  const time =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (compact) {
    return (
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          phase === "open" ? "text-foreground" : "text-muted-foreground",
          urgent && "text-live",
          className,
        )}
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
          urgent && "text-live animate-live-pulse",
        )}
      >
        {time}
      </span>
    </div>
  );
}
