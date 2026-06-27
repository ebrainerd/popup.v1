"use client";

import type { StreamProvider } from "@/lib/database.types";
import { effectiveStreamProvider, usesNativeStream } from "@/lib/live-stream";
import { CameraTestPanel } from "@/components/camera-test-panel";
import { NativeLivePublisher } from "@/components/native-live-publisher";
import { ShopQuickActions } from "@/components/shop-quick-actions";

export function LiveControlsCard({
  shopId,
  isLive,
  isOpen,
  isScheduled,
  isEnded,
  streamProvider,
  liveUrl,
  twitchUrl,
  needsTosAcceptance,
  nativeEnabled,
}: {
  shopId: string;
  isLive: boolean;
  isOpen: boolean;
  isScheduled: boolean;
  isEnded: boolean;
  streamProvider: StreamProvider;
  liveUrl: string | null;
  twitchUrl: string | null;
  needsTosAcceptance: boolean;
  nativeEnabled: boolean;
}) {
  const provider = effectiveStreamProvider({
    stream_provider: streamProvider,
    live_url: liveUrl,
    twitch_url: twitchUrl,
  });
  const isNative = usesNativeStream(provider);
  const canTestCamera = !isEnded && (isOpen || isScheduled);
  const showMobileBanner =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) &&
    isNative &&
    nativeEnabled;

  return (
    <div className="space-y-4">
      {showMobileBanner && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          For the best go-live experience, use desktop Chrome. Mobile support is improving.
        </p>
      )}

      {isNative && canTestCamera && <CameraTestPanel disabled={isEnded} />}

      {isNative && (
        <NativeLivePublisher
          shopId={shopId}
          initialIsLive={isLive}
          needsTosAcceptance={needsTosAcceptance}
          disabled={!isOpen || isEnded}
        />
      )}

      <ShopQuickActions
        shopId={shopId}
        isLive={isLive}
        isOpen={isOpen}
        isEnded={isEnded}
        canGoLive={!isNative}
        hasLiveUrl={Boolean(liveUrl || twitchUrl)}
        nativePublisherActive={isNative}
      />
    </div>
  );
}
