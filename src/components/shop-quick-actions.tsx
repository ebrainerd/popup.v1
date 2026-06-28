"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radio, Clock, Check } from "lucide-react";
import { extendShop, toggleLive } from "@/app/dashboard/actions";
import { CloseShopButton } from "@/components/close-shop-dialog";
import { Button } from "@/components/ui/button";

export function ShopQuickActions({
  shopId,
  startAt,
  endAt,
  isLive,
  isOpen,
  isEnded,
  hasLiveUrl,
  canGoLive = true,
  nativePublisherActive = false,
  variant = "full",
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  isLive: boolean;
  isOpen: boolean;
  isEnded: boolean;
  hasLiveUrl: boolean;
  /** When false, go-live is handled elsewhere (native publisher). */
  canGoLive?: boolean;
  nativePublisherActive?: boolean;
  /** live-only: Go live button only (owner bar on shop page). */
  variant?: "full" | "live-only";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(isLive);
  const [error, setError] = useState<string | null>(null);

  function onExtend(minutes: number) {
    setError(null);
    startTransition(async () => {
      const res = await extendShop(shopId, minutes);
      if (res.error) setError(res.error);
      router.refresh();
    });
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
      }
      router.refresh();
    });
  }

  const showShopWindowControls = isOpen && !isEnded && variant === "full";

  if (
    variant === "live-only" &&
    !(canGoLive && isOpen)
  ) {
    return null;
  }

  if (!showShopWindowControls && !canGoLive && !(nativePublisherActive && isLive) && !isEnded && variant === "full") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canGoLive && isOpen && (
          <Button
            variant={live ? "destructive" : "default"}
            size="sm"
            onClick={onToggleLive}
            disabled={pending || !hasLiveUrl || isEnded}
            title={!hasLiveUrl ? "Add a live stream URL first" : ""}
          >
            {live ? <Check className="size-4" /> : <Radio className="size-4" />}
            {live ? "End live" : "Go live"}
          </Button>
        )}

        {nativePublisherActive && isLive && (
          <span className="text-sm text-muted-foreground">Video controls are above.</span>
        )}

        {showShopWindowControls && (
          <>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtend(15)}
                disabled={pending}
              >
                <Clock className="size-4" /> +15m
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtend(60)}
                disabled={pending}
              >
                +1h
              </Button>
            </div>

            <CloseShopButton
              shopId={shopId}
              startAt={startAt}
              endAt={endAt}
              variant="outline"
              className="text-live"
            />
          </>
        )}
      </div>
      {error && <p className="text-sm text-live">{error}</p>}
      {isEnded && (
        <p className="text-sm text-muted-foreground">
          This shop has ended. View the drop report below for results.
        </p>
      )}
    </div>
  );
}
