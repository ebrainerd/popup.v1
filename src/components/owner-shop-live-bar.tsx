"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { StreamProvider } from "@/lib/database.types";
import { effectiveStreamProvider } from "@/lib/live-stream";
import { NativeLivePublisher } from "@/components/native-live-publisher";
import { ShopQuickActions } from "@/components/shop-quick-actions";

export function OwnerShopLiveBar({
  shopId,
  isLive,
  isOpen,
  isEnded,
  streamProvider,
  liveUrl,
  twitchUrl,
  nativeEnabled,
  needsTosAcceptance,
}: {
  shopId: string;
  isLive: boolean;
  isOpen: boolean;
  isEnded: boolean;
  streamProvider: StreamProvider;
  liveUrl: string | null;
  twitchUrl: string | null;
  nativeEnabled: boolean;
  needsTosAcceptance: boolean;
}) {
  if (!isOpen || isEnded) return null;

  const provider = effectiveStreamProvider({
    stream_provider: streamProvider,
    live_url: liveUrl,
    twitch_url: twitchUrl,
  });
  const isNative = provider === "native" && nativeEnabled;

  return (
    <section className="mb-6 rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Your stream</h2>
          {isLive && (
            <span className="rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live">
              LIVE
            </span>
          )}
        </div>
        <Link
          href={`/dashboard/shops/${shopId}#live-controls`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Full live controls →
        </Link>
      </div>

      {isNative ? (
        <NativeLivePublisher
          shopId={shopId}
          initialIsLive={isLive}
          needsTosAcceptance={needsTosAcceptance}
          canGoLive={isOpen}
          isEnded={isEnded}
          embedded
        />
      ) : (
        <ShopQuickActions
          shopId={shopId}
          isLive={isLive}
          isOpen={isOpen}
          isEnded={isEnded}
          hasLiveUrl={Boolean(liveUrl || twitchUrl)}
        />
      )}
    </section>
  );
}
