"use client";

import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { CopyLink } from "@/components/copy-link";
import { cn } from "@/lib/utils";
import type { DropHealth } from "@/lib/drop-readiness";

const SHARE_COPIED_KEY = "popup-share-copied";

export function LaunchChecklist({
  health,
  shopId,
  isDraft,
}: {
  health: DropHealth;
  shopId: string;
  isDraft: boolean;
}) {
  const [shareCopied, setShareCopied] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${SHARE_COPIED_KEY}:${shopId}`) === "1";
  });

  useEffect(() => {
    const handler = () => {
      const key = `${SHARE_COPIED_KEY}:${shopId}`;
      if (localStorage.getItem(key) === "1") setShareCopied(true);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [shopId]);

  function markShareCopied() {
    const key = `${SHARE_COPIED_KEY}:${shopId}`;
    localStorage.setItem(key, "1");
    setShareCopied(true);
  }

  const items = health.items.map((item) =>
    item.id === "share" ? { ...item, done: shareCopied } : item,
  );
  const readyCount = items.filter((i) => !i.optional && i.done).length;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold leading-none">Launch checklist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {readyCount} of {health.totalRequired} required steps complete
          </p>
        </div>
        {!isDraft && (
          <div onClick={markShareCopied}>
            <CopyLink path={`/shop/${shopId}`} label="Share shop link" />
          </div>
        )}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              item.done
                ? "border-success/40 bg-success/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {item.done ? (
              <Check className="size-3.5 shrink-0 text-success" />
            ) : (
              <Circle className="size-3.5 shrink-0" />
            )}
            <span className={cn("whitespace-nowrap", item.done && "line-through opacity-80")}>
              {item.label}
              {item.optional && <span className="ml-1 text-xs opacity-70">(optional)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
