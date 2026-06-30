"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-width chat for Live Stage (`broadcast`) — sits below the product grid.
 * Collapsed by default on small screens so the stream stays above the fold.
 * Keep in sync with StreamChatRow chat placement in shop-page-view.tsx.
 */
export function BroadcastChatPanel({
  children,
  isScheduled,
}: {
  children: React.ReactNode;
  isScheduled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = isScheduled ? "Announcements" : "Shop chat";

  return (
    <section className="mt-8">
      <div className="lg:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" />
            {label}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open && <div className="mt-3 min-h-[16rem]">{children}</div>}
      </div>
      <div className="hidden min-h-[20rem] lg:block">{children}</div>
    </section>
  );
}
