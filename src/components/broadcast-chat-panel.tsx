"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_EXPANDED =
  "max-h-[40vh] min-h-[12rem] overflow-hidden";

/**
 * Mobile-collapsible chat shell. Two placements:
 * - `below` — full-width band under the product grid (Live Stage / Drop Clock).
 * - `sidebar` — second column beside the stream on desktop; collapsed accordion
 *   on mobile. Keep in sync with StreamChatRow in shop-page-view.tsx.
 */
export function BroadcastChatPanel({
  children,
  isScheduled,
  layout = "below",
}: {
  children: React.ReactNode;
  isScheduled: boolean;
  layout?: "below" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const label = isScheduled ? "Announcements" : "Shop chat";

  const toggle = (
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
  );

  if (layout === "sidebar") {
    return (
      <aside className="flex min-h-0 flex-col">
        <div className="lg:hidden">{toggle}</div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !open && "hidden lg:flex",
            open && cn(MOBILE_EXPANDED, "lg:max-h-none"),
          )}
        >
          {children}
        </div>
      </aside>
    );
  }

  return (
    <section className="mt-8">
      <div className="lg:hidden">
        {toggle}
        {open && <div className={cn("mt-3", MOBILE_EXPANDED)}>{children}</div>}
      </div>
      <div className="hidden min-h-[20rem] lg:block">{children}</div>
    </section>
  );
}
