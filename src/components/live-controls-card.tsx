"use client";

import type { StreamProvider } from "@/lib/database.types";
import { effectiveStreamProvider } from "@/lib/live-stream";
import { NativeLivePublisher } from "@/components/native-live-publisher";
import { ShopQuickActions } from "@/components/shop-quick-actions";
import { StreamSourceSettings } from "@/components/stream-source-settings";

export function LiveControlsCard({
  shopId,
  startAt,
  endAt,
  isLive,
  isOpen,
  isEnded,
  streamProvider,
  liveUrl,
  twitchUrl,
  needsTosAcceptance,
  nativeEnabled,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  isLive: boolean;
  isOpen: boolean;
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
  const isNative = provider === "native" && nativeEnabled;
  const showMobileBanner =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) &&
    isNative;

  return (
    <div className="space-y-4">
      <StreamSourceSettings
        shopId={shopId}
        streamProvider={streamProvider}
        liveUrl={liveUrl}
        twitchUrl={twitchUrl}
        nativeEnabled={nativeEnabled}
        isLive={isLive}
      />

      {showMobileBanner && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          For the best go-live experience, use desktop Chrome. Mobile support is improving.
        </p>
      )}

      {isNative && (
        <NativeLivePublisher
          shopId={shopId}
          initialIsLive={isLive}
          needsTosAcceptance={needsTosAcceptance}
          canGoLive={isOpen}
          isEnded={isEnded}
        />
      )}

      <ShopQuickActions
        shopId={shopId}
        startAt={startAt}
        endAt={endAt}
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
