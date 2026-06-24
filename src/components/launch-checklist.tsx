"use client";

import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { CopyLink } from "@/components/copy-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DropHealth } from "@/lib/drop-readiness";

const SHARE_COPIED_KEY = "popup-share-copied";

export function LaunchChecklist({ health, shopId }: { health: DropHealth; shopId: string }) {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle>Launch checklist</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {readyCount} of {health.totalRequired} required steps complete
          </p>
        </div>
        <div onClick={markShareCopied}>
          <CopyLink path={`/shop/${shopId}`} label="Share shop link" />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <Check className="size-4 shrink-0 text-success" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className={cn(item.done && "text-muted-foreground line-through")}>
                {item.label}
                {item.optional && (
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function DropHealthSummary({ health }: { health: DropHealth }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Drop health</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Status" value={health.isPublished ? "Published" : "Draft"} />
          <Stat
            label="Opens"
            value={new Date(health.openingAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          />
          <Stat label="Products" value={String(health.productCount)} />
          <Stat label="Available units" value={String(health.availableUnits)} />
          <Stat label="Followers" value={String(health.followerCount)} />
          <Stat label="Waitlist" value={String(health.reminderCount)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
