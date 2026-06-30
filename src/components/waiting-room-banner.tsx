"use client";

import { useEffect, useState } from "react";
import { Clock, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/** Status banner for non–Drop Clock layouts; countdown hero owns the timer (§5.3). */
export function WaitingRoomBanner({
  startAt,
  hasReminder,
}: {
  startAt: string;
  hasReminder: boolean;
}) {
  const [minutesLeft, setMinutesLeft] = useState(() => minutesUntil(startAt));

  useEffect(() => {
    const id = setInterval(() => setMinutesLeft(minutesUntil(startAt)), 30_000);
    return () => clearInterval(id);
  }, [startAt]);

  const isFinalStretch = minutesLeft <= 10 && minutesLeft > 0;
  const isOpen = minutesLeft <= 0;

  if (!isFinalStretch && !hasReminder) return null;

  return (
    <div
      className={cn(
        "mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        isFinalStretch
          ? "border-accent/50 bg-accent/10 text-accent-foreground"
          : "border-border bg-muted/50",
        isOpen && "border-success/50 bg-success/10",
      )}
    >
      {isOpen ? (
        <>
          <DoorOpen className="size-5 shrink-0 text-success" />
          <p className="font-medium">The drop is open — grab what you want before it&apos;s gone!</p>
        </>
      ) : isFinalStretch ? (
        <>
          <Clock className="size-5 shrink-0 animate-pulse" />
          <p className="font-medium">
            {hasReminder
              ? "You're in the waiting room — opening in minutes!"
              : `Opening in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}!`}
          </p>
        </>
      ) : hasReminder ? (
        <>
          <Clock className="size-5 shrink-0" />
          <p>You&apos;re on the list — we&apos;ll remind you before this drop opens.</p>
        </>
      ) : null}
    </div>
  );
}

function minutesUntil(startAt: string): number {
  return Math.max(0, Math.ceil((new Date(startAt).getTime() - Date.now()) / 60_000));
}
