"use client";

import { useState, useTransition } from "react";
import { Megaphone, Send } from "lucide-react";
import { postAnnouncement } from "@/app/shop/announcement-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShopAnnouncement } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function ShopAnnouncements({
  shopId,
  initialAnnouncements,
  isOwner,
  isScheduled,
  className,
}: {
  shopId: string;
  initialAnnouncements: ShopAnnouncement[];
  isOwner: boolean;
  isScheduled: boolean;
  className?: string;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isScheduled && announcements.length === 0) return null;

  function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await postAnnouncement(shopId, value);
      if (!res.ok) {
        setError(res.error ?? "Could not post.");
        return;
      }
      setAnnouncements((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          shop_id: shopId,
          seller_id: "",
          message: value,
          created_at: new Date().toISOString(),
        },
      ]);
      setText("");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        className ?? "h-[28rem] lg:h-[32rem]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Megaphone className="size-4 text-accent" />
        <span className="text-sm font-semibold">Waiting room</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {announcements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isOwner
              ? "Post an announcement for buyers waiting for the drop."
              : "The seller hasn't posted yet. Set a reminder and check back soon."}
          </p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-sm">{a.message}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(a.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </div>

      {isOwner && isScheduled && (
        <div className="border-t border-border p-3">
          <form onSubmit={handlePost} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Announce to the waiting room…"
              maxLength={500}
            />
            <Button type="submit" size="icon" disabled={pending || !text.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
          {error && <p className="mt-1 text-xs text-live">{error}</p>}
        </div>
      )}
    </div>
  );
}
