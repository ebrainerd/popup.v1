"use client";

import type { StreamProvider } from "@/lib/database.types";
import { effectiveStreamProvider } from "@/lib/live-stream";
import { CameraTestPanel } from "@/components/camera-test-panel";
import { NativeLivePublisher } from "@/components/native-live-publisher";
import { ShopQuickActions } from "@/components/shop-quick-actions";
import { StreamSourceSettings } from "@/components/stream-source-settings";

export function LiveControlsCard({
  shopId,
  isLive,
  isOpen,
  isDraft,
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
  isDraft: boolean;
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
  const canTestCamera = !isEnded && isNative;
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

      {isNative && !isEnded && (
        <p className="text-sm text-muted-foreground">
          Use <strong className="font-medium text-foreground">Test camera</strong> below anytime
          before your drop — buyers won&apos;t see it. When your shop is open, click{" "}
          <strong className="font-medium text-foreground">Go live</strong> to broadcast.
        </p>
      )}

      {showMobileBanner && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          For the best go-live experience, use desktop Chrome. Mobile support is improving.
        </p>
      )}

      {canTestCamera && <CameraTestPanel disabled={isEnded} />}

      {isNative && (
        <NativeLivePublisher
          shopId={shopId}
          initialIsLive={isLive}
          needsTosAcceptance={needsTosAcceptance}
          disabled={!isOpen || isEnded}
        />
      )}

      {!isOpen && !isEnded && isNative && (
        <p className="text-xs text-muted-foreground">
          {isDraft
            ? "Go live unlocks after you publish and your shop window is open. You can still test your camera above."
            : "Go live unlocks when your shop opens. You can still test your camera above."}
        </p>
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
