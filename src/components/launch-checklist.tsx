"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupPaymentsButton } from "@/components/setup-payments-button";
import { cn } from "@/lib/utils";
import type { DropHealth, DropReadinessItem } from "@/lib/drop-readiness";

const SHARE_COPIED_KEY = "popup-share-copied";
const PROMO_DONE_KEY = "popup-promo-done";

const PROMO_TRACKED_IDS = new Set(["share", "post-social", "pin-link", "hour-before"]);

function promoStorageKey(shopId: string, itemId: string) {
  if (itemId === "share") return `${SHARE_COPIED_KEY}:${shopId}`;
  return `${PROMO_DONE_KEY}:${itemId}:${shopId}`;
}

function readPromoDone(shopId: string, itemId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(promoStorageKey(shopId, itemId)) === "1";
}

export function LaunchChecklist({
  health,
  shopId,
  isDraft,
  paymentsRequired = false,
  payoutsConnected = true,
}: {
  health: DropHealth;
  shopId: string;
  isDraft: boolean;
  paymentsRequired?: boolean;
  payoutsConnected?: boolean;
}) {
  const [promoDone, setPromoDone] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const id of PROMO_TRACKED_IDS) {
      next[id] = readPromoDone(shopId, id);
    }
    return next;
  });

  useEffect(() => {
    function refresh() {
      const updated: Record<string, boolean> = {};
      for (const id of PROMO_TRACKED_IDS) {
        updated[id] = readPromoDone(shopId, id);
      }
      setPromoDone(updated);
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("popup-share-copied", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("popup-share-copied", refresh);
    };
  }, [shopId]);

  function markPromoDone(itemId: string) {
    localStorage.setItem(promoStorageKey(shopId, itemId), "1");
    setPromoDone((prev) => ({ ...prev, [itemId]: true }));
  }

  const items = health.items.map((item) =>
    PROMO_TRACKED_IDS.has(item.id) ? { ...item, done: promoDone[item.id] ?? false } : item,
  );
  const setupItems = items.filter((item) => item.group === "setup");
  const promotionItems = items.filter((item) => item.group === "promotion");
  const readyCount = setupItems.filter((i) => !i.optional && i.done).length;

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/shop/${shopId}`;
              navigator.clipboard.writeText(url).then(() => markPromoDone("share"));
            }}
          >
            <Link2 className="size-4" />
            Share shop link
          </Button>
        )}
        {paymentsRequired && !payoutsConnected && (
          <SetupPaymentsButton
            redirectTo={`/dashboard/shops/${shopId}`}
            size="sm"
            className="shrink-0"
          />
        )}
      </div>

      <ChecklistGroup title="Setup" items={setupItems} />

      {!isDraft && promotionItems.length > 0 && (
        <ChecklistGroup
          title="Promotion"
          subtitle="Optional — tap to mark done as you go"
          items={promotionItems}
          onToggle={markPromoDone}
          interactive
          className="mt-4 border-t border-border pt-3"
        />
      )}
    </div>
  );
}

function ChecklistGroup({
  title,
  subtitle,
  items,
  onToggle,
  interactive,
  className,
}: {
  title: string;
  subtitle?: string;
  items: DropReadinessItem[];
  onToggle?: (id: string) => void;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!interactive || item.done}
            onClick={() => interactive && !item.done && onToggle?.(item.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-left",
              item.done
                ? "border-success/40 bg-success/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground",
              interactive && !item.done && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
              interactive && item.done && "cursor-default",
              !interactive && "cursor-default",
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
          </button>
        ))}
      </div>
    </div>
  );
}
