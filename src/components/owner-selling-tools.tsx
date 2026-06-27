"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function OwnerSellingTools({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Selling tools</p>
            <p className="text-xs text-muted-foreground">Flash deals and auction queue</p>
          </div>
        </div>
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-4 border-t border-border p-4">{children}</div>}
    </section>
  );
}
