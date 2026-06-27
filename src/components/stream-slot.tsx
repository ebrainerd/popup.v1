"use client";

import Image from "next/image";
import { useState } from "react";
import type { Shop } from "@/lib/database.types";
import type { StreamProvider } from "@/lib/database.types";
import type { LiveEmbed as LiveEmbedInfo } from "@/lib/embeds";
import type { ShopTheme } from "@/lib/shop-theme";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { LiveEmbed as LiveEmbedPlayer } from "@/components/live-embed";
import { NativeLivePlayer } from "@/components/native-live-player";
import { NotifyWhenLiveButton } from "@/components/notify-when-live-button";
import { useShopEvent } from "@/components/shop-room";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";
import { cn } from "@/lib/utils";

export function StreamSlot({
  shop,
  layout,
  isOpen,
  isScheduled,
  isOwner,
  initialIsLive,
  streamProvider,
  nativeEnabled,
  embed,
  profileId,
  hasLiveReminder,
  liveReminderCount,
  className,
}: {
  shop: Shop;
  layout: ShopTheme["layout"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  initialIsLive: boolean;
  streamProvider: StreamProvider;
  nativeEnabled: boolean;
  embed: LiveEmbedInfo | null;
  profileId?: string;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  className?: string;
}) {
  const [isLive, setIsLive] = useState(initialIsLive);

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    const data = payload as LiveBroadcast;
    setIsLive(data.isLive);
  });

  const showNative = nativeEnabled && streamProvider === "native";
  const showExternalLive = isLive && embed?.embeddable && streamProvider !== "native";
  const showNativeLive = isLive && showNative;
  const showCover = !showNativeLive && !showExternalLive;

  const countdownFocus = layout === "countdown" && isScheduled;
  const catalogHero = layout === "catalog" && showCover;
  const wideHero = layout === "broadcast" || showNative || catalogHero;

  return (
    <div className={cn("min-w-0", className)}>
      {showNativeLive && <NativeLivePlayer shopId={shop.id} initialIsLive={isLive} />}

      {showExternalLive && embed && <LiveEmbedPlayer embed={embed} />}

      {showCover && (
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            wideHero ? "aspect-video rounded-xl" : "aspect-[16/6] rounded-2xl",
            countdownFocus && "aspect-[16/9] ring-2 ring-[var(--shop-accent)]/50",
          )}
        >
          {shop.cover_url ? (
            <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--shop-accent)]/20 to-accent/20" />
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            {isOpen ? (
              <Badge variant="success">Open now</Badge>
            ) : isScheduled ? (
              <Badge variant="accent">Opening soon</Badge>
            ) : (
              <Badge variant="muted">Ended</Badge>
            )}
          </div>
          {isScheduled && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/30",
                countdownFocus && "bg-black/50",
              )}
            >
              <div className="text-center text-white">
                <p
                  className={cn(
                    "font-medium uppercase tracking-widest opacity-90",
                    countdownFocus ? "text-base" : "text-sm",
                  )}
                >
                  Drop opens in
                </p>
                <div className={cn("mt-2 font-bold", countdownFocus ? "text-4xl" : "text-2xl")}>
                  <Countdown startAt={shop.start_at} endAt={shop.end_at} />
                </div>
              </div>
            </div>
          )}
          {isOpen && !isLive && !isOwner && showNative && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center sm:justify-start">
              <NotifyWhenLiveButton
                shopId={shop.id}
                initialSubscribed={hasLiveReminder}
                isAuthed={Boolean(profileId)}
                reminderCount={liveReminderCount}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
