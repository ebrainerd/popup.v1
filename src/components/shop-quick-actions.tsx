"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StreamProvider } from "@/lib/database.types";
import { Radio, Check } from "lucide-react";
import { toggleLive } from "@/app/dashboard/actions";
import { useBroadcastLiveState } from "@/hooks/use-broadcast-live-state";
import { Button } from "@/components/ui/button";

/** External-stream go-live controls (native live uses NativeLivePublisher). */
export function ShopQuickActions({
  shopId,
  isLive,
  isOpen,
  isEnded,
  hasLiveUrl,
  streamProvider,
}: {
  shopId: string;
  isLive: boolean;
  isOpen: boolean;
  isEnded: boolean;
  hasLiveUrl: boolean;
  streamProvider: StreamProvider;
}) {
  const router = useRouter();
  const broadcastLive = useBroadcastLiveState(shopId);
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(isLive);
  const [prevIsLive, setPrevIsLive] = useState(isLive);
  const [error, setError] = useState<string | null>(null);

  if (prevIsLive !== isLive) {
    setPrevIsLive(isLive);
    setLive(isLive);
  }

  function onToggleLive() {
    setError(null);
    const next = !live;
    setLive(next);
    startTransition(async () => {
      const res = await toggleLive(shopId, next);
      if (res.error) {
        setLive(!next);
        setError(res.error);
        return;
      }
      broadcastLive(next, streamProvider);
      router.refresh();
    });
  }

  if (!isOpen || isEnded) return null;

  return (
    <div className="space-y-2">
      <Button
        variant={live ? "destructive" : "default"}
        size="sm"
        onClick={onToggleLive}
        disabled={pending || !hasLiveUrl}
        title={!hasLiveUrl ? "Add a YouTube or Twitch stream URL first" : undefined}
      >
        {live ? <Check className="size-4" /> : <Radio className="size-4" />}
        {live ? "End live" : "Go live"}
      </Button>
      {error && <p className="text-sm text-live">{error}</p>}
    </div>
  );
}
