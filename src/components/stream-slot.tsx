"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Shop } from "@/lib/database.types";
import type { StreamProvider } from "@/lib/database.types";
import type { LiveEmbed as LiveEmbedInfo } from "@/lib/embeds";
import type { ShopTheme } from "@/lib/shop-theme";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { LiveEmbed as LiveEmbedPlayer } from "@/components/live-embed";
import { NativeLivePlayer } from "@/components/native-live-player";
import {
  NativeLivePublisher,
  type PublisherState,
} from "@/components/native-live-publisher";
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
  isDraftPreview,
  initialIsLive,
  streamProvider,
  nativeEnabled,
  needsTosAcceptance,
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
  isDraftPreview?: boolean;
  initialIsLive: boolean;
  streamProvider: StreamProvider;
  nativeEnabled: boolean;
  needsTosAcceptance?: boolean;
  embed: LiveEmbedInfo | null;
  profileId?: string;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  className?: string;
}) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [publisherState, setPublisherState] = useState<PublisherState>(
    initialIsLive ? "live" : "idle",
  );

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    const data = payload as LiveBroadcast;
    setIsLive(data.isLive);
  });

  const showNative = nativeEnabled && streamProvider === "native";
  const ownerNativeSlot = isOwner && showNative && isOpen && !isDraftPreview;
  const showExternalLive = isLive && embed?.embeddable && streamProvider !== "native";
  const showNativeLive = isLive && showNative && !ownerNativeSlot;
  const showCover = !showNativeLive && !showExternalLive && !ownerNativeSlot;

  const countdownFocus = layout === "countdown" && isScheduled;
  const catalogHero = layout === "catalog" && showCover;
  const wideHero = layout === "broadcast" || showNative || catalogHero || ownerNativeSlot;

  if (ownerNativeSlot) {
    const showCoverBehind = publisherState === "idle" && !isLive;

    return (
      <div className={cn("min-w-0", className)}>
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            wideHero ? "aspect-video rounded-xl" : "aspect-[16/6] rounded-2xl",
          )}
        >
          {showCoverBehind && (
            <StreamCover
              shop={shop}
              layout={layout}
              isOpen={isOpen}
              isScheduled={isScheduled}
              isOwner={isOwner}
              isLive={isLive}
              showNative={showNative}
              profileId={profileId}
              hasLiveReminder={hasLiveReminder}
              liveReminderCount={liveReminderCount}
              countdownFocus={countdownFocus}
              fillParent
            />
          )}
          <NativeLivePublisher
            shopId={shop.id}
            initialIsLive={initialIsLive}
            needsTosAcceptance={needsTosAcceptance ?? false}
            canGoLive={isOpen}
            isEnded={false}
            slotMode
            onStateChange={setPublisherState}
          />
          <Link
            href={`/dashboard/shops/${shop.id}#live-controls`}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white hover:bg-black/80"
          >
            Full live controls →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      {showNativeLive && <NativeLivePlayer shopId={shop.id} initialIsLive={isLive} />}

      {showExternalLive && embed && <LiveEmbedPlayer embed={embed} />}

      {showCover && (
        <StreamCover
          shop={shop}
          layout={layout}
          isOpen={isOpen}
          isScheduled={isScheduled}
          isOwner={isOwner}
          isLive={isLive}
          showNative={showNative}
          profileId={profileId}
          hasLiveReminder={hasLiveReminder}
          liveReminderCount={liveReminderCount}
          countdownFocus={countdownFocus}
          wideHero={wideHero}
        />
      )}
    </div>
  );
}

function StreamCover({
  shop,
  layout,
  isOpen,
  isScheduled,
  isOwner,
  isLive,
  showNative,
  profileId,
  hasLiveReminder,
  liveReminderCount,
  countdownFocus,
  wideHero = layout === "broadcast" || showNative || layout === "catalog",
  fillParent = false,
}: {
  shop: Shop;
  layout: ShopTheme["layout"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  isLive: boolean;
  showNative: boolean;
  profileId?: string;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  countdownFocus: boolean;
  wideHero?: boolean;
  fillParent?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        fillParent ? "absolute inset-0" : "w-full",
        !fillParent && (wideHero ? "aspect-video rounded-xl" : "aspect-[16/6] rounded-2xl"),
        !fillParent && countdownFocus && "aspect-[16/9] ring-2 ring-[var(--shop-accent)]/50",
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
  );
}
