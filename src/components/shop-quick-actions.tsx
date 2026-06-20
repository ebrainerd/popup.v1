"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radio, Clock, Trash2, Check } from "lucide-react";
import { extendShop, toggleLive, deleteShop } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function ShopQuickActions({
  shopId,
  isLive,
  isOpen,
  hasLiveUrl,
}: {
  shopId: string;
  isLive: boolean;
  isOpen: boolean;
  hasLiveUrl: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(isLive);

  function onExtend(minutes: number) {
    startTransition(async () => {
      await extendShop(shopId, minutes);
      router.refresh();
    });
  }

  function onToggleLive() {
    const next = !live;
    setLive(next);
    startTransition(async () => {
      const res = await toggleLive(shopId, next);
      if (res.error) setLive(!next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={live ? "destructive" : "default"}
        size="sm"
        onClick={onToggleLive}
        disabled={pending || !hasLiveUrl || !isOpen}
        title={!hasLiveUrl ? "Add a live stream URL first" : !isOpen ? "Shop must be open" : ""}
      >
        {live ? <Check className="size-4" /> : <Radio className="size-4" />}
        {live ? "End live" : "Go live"}
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onExtend(15)} disabled={pending || !isOpen}>
          <Clock className="size-4" /> +15m
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExtend(60)} disabled={pending || !isOpen}>
          +1h
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-live"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this shop and all its products? This cannot be undone.")) {
            startTransition(async () => {
              await deleteShop(shopId);
            });
          }
        }}
      >
        <Trash2 className="size-4" /> Delete
      </Button>
    </div>
  );
}
