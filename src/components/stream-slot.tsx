"use client";

/**
 * Stream hero / cover / countdown for buyer shop pages.
 * Live Stage (`broadcast`) wideHero + compact scheduled countdown: see
 * docs/SHOP_LAYOUT_ARCHETYPES.md §5.1 — keep in sync with shop-page-view.tsx.
 * Lookbook (`catalog`) secondary band below products: §5.2 — max ~40vh.
 * Drop Clock (`countdown`) oversized hero + shrink at open: §5.3.
 */
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
import { useShopPhase } from "@/hooks/use-shop-open";
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
  nativeLiveStartedAt,
  streamProvider,
  nativeEnabled,
  needsTosAcceptance,
  embed,
  profileId,
  hasLiveReminder,
  liveReminderCount,
  streamPlacement = "primary",
  fillHeight = false,
  className,
}: {
  shop: Shop;
  layout: ShopTheme["layout"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  isDraftPreview?: boolean;
  initialIsLive: boolean;
  nativeLiveStartedAt?: string | null;
  streamProvider: StreamProvider;
  nativeEnabled: boolean;
  needsTosAcceptance?: boolean;
  embed: LiveEmbedInfo | null;
  profileId?: string;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  streamPlacement?: "primary" | "secondary";
  /**
   * Fill the parent's fixed height on desktop instead of using an aspect
   * ratio, so the stream window always matches the chat sidebar exactly
   * (The Room layout). Mobile keeps the aspect-ratio sizing.
   */
  fillHeight?: boolean;
  className?: string;
}) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [prevInitialIsLive, setPrevInitialIsLive] = useState(initialIsLive);
  const [publisherState, setPublisherState] = useState<PublisherState>(
    initialIsLive ? "connecting" : "idle",
  );
  const [prevPublisherInitial, setPrevPublisherInitial] = useState(initialIsLive);

  if (prevInitialIsLive !== initialIsLive) {
    setPrevInitialIsLive(initialIsLive);
    setIsLive(initialIsLive);
  }
  if (prevPublisherInitial !== initialIsLive) {
    setPrevPublisherInitial(initialIsLive);
    if (!initialIsLive) setPublisherState("idle");
  }

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    const data = payload as LiveBroadcast;
    setIsLive(data.isLive);
    if (!data.isLive) setPublisherState("idle");
  });

  const isCountdown = layout === "countdown";
  const phase = useShopPhase(shop.start_at, shop.end_at, { isOpen, isScheduled });
  const effectiveScheduled = isDraftPreview || phase.isScheduled;
  const effectiveOpen = !isDraftPreview && phase.isOpen;

  const showNative = nativeEnabled && streamProvider === "native";
  const ownerNativeSlot = isOwner && showNative && effectiveOpen && !isDraftPreview;
  const showExternalLive = isLive && embed?.embeddable && streamProvider !== "native";
  const showNativeLive = isLive && showNative && !ownerNativeSlot;
  const showCover = !showNativeLive && !showExternalLive && !ownerNativeSlot;

  const countdownFocus = isCountdown && effectiveScheduled;
  /** Live Stage uses a compact hero countdown — not the Drop Clock takeover. */
  const broadcastScheduled = layout === "broadcast" && effectiveScheduled;
  /** Lookbook stream/cover sits below the product grid — cap height, slim countdown. */
  const catalogSecondary = layout === "catalog" && streamPlacement === "secondary";
  const wideHero =
    !catalogSecondary &&
    (layout === "broadcast" || showNative || ownerNativeSlot || countdownFocus);

  const secondaryBandClass = catalogSecondary ? "max-h-[40vh] overflow-hidden rounded-xl" : undefined;

  if (ownerNativeSlot) {
    const showCoverBehind =
      publisherState === "idle" && !initialIsLive;

    return (
      <div className={cn("min-w-0", className, secondaryBandClass)}>
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            wideHero ? "aspect-video rounded-xl" : "aspect-[16/6] rounded-2xl",
            catalogSecondary && "aspect-[21/9]",
            fillHeight && "lg:aspect-auto lg:h-full",
          )}
        >
          {showCoverBehind && (
            <StreamCover
              shop={shop}
              layout={layout}
              isOpen={effectiveOpen}
              isScheduled={effectiveScheduled}
              isOwner={isOwner}
              isLive={isLive}
              showNative={showNative}
              profileId={profileId}
              hasLiveReminder={hasLiveReminder}
              liveReminderCount={liveReminderCount}
              countdownFocus={countdownFocus}
              broadcastScheduled={broadcastScheduled}
              catalogSecondary={catalogSecondary}
              fillParent
            />
          )}
          <NativeLivePublisher
            shopId={shop.id}
            initialIsLive={initialIsLive}
            nativeLiveStartedAt={nativeLiveStartedAt}
            needsTosAcceptance={needsTosAcceptance ?? false}
            canGoLive={effectiveOpen}
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
    <div className={cn("min-w-0", className, secondaryBandClass)}>
      {showNativeLive && (
        <div
          className={cn(
            catalogSecondary && "max-h-[40vh] overflow-hidden rounded-xl",
            fillHeight && "lg:h-full",
          )}
        >
          <NativeLivePlayer shopId={shop.id} initialIsLive={isLive} fillHeight={fillHeight} />
        </div>
      )}

      {showExternalLive && embed && (
        <div
          className={cn(
            catalogSecondary && "max-h-[40vh] overflow-hidden rounded-xl",
            fillHeight && "lg:h-full",
          )}
        >
          <LiveEmbedPlayer embed={embed} fillHeight={fillHeight} />
        </div>
      )}

      {showCover && (
        <StreamCover
          shop={shop}
          layout={layout}
          isOpen={effectiveOpen}
          isScheduled={effectiveScheduled}
          isOwner={isOwner}
          isLive={isLive}
          showNative={showNative}
          profileId={profileId}
          hasLiveReminder={hasLiveReminder}
          liveReminderCount={liveReminderCount}
          countdownFocus={countdownFocus}
          broadcastScheduled={broadcastScheduled}
          catalogSecondary={catalogSecondary}
          wideHero={wideHero}
          countdownOpen={isCountdown && effectiveOpen}
          fillHeight={fillHeight}
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
  broadcastScheduled = false,
  catalogSecondary = false,
  wideHero = layout === "broadcast" || showNative,
  countdownOpen = false,
  fillParent = false,
  fillHeight = false,
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
  broadcastScheduled?: boolean;
  catalogSecondary?: boolean;
  wideHero?: boolean;
  countdownOpen?: boolean;
  fillParent?: boolean;
  fillHeight?: boolean;
}) {
  const slimCountdown = broadcastScheduled || catalogSecondary;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted transition-[aspect-ratio] duration-700 ease-in-out",
        fillParent ? "absolute inset-0" : "w-full",
        !fillParent &&
          (countdownFocus
            ? "aspect-[16/9] rounded-2xl ring-2 ring-[var(--shop-accent)]/50"
            : countdownOpen
              ? "aspect-[16/6] rounded-xl"
              : wideHero
                ? "aspect-video rounded-xl"
                : catalogSecondary
                  ? "aspect-[21/9] rounded-xl"
                  : "aspect-[16/6] rounded-2xl"),
        catalogSecondary && !fillParent && "max-h-[40vh]",
        fillHeight && !fillParent && "lg:aspect-auto lg:h-full",
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
            "absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-700",
            countdownFocus && "bg-black/55",
            slimCountdown && "items-end justify-start bg-gradient-to-t from-black/70 to-transparent pb-4 pl-4",
          )}
        >
          <div
            className={cn(
              "text-white",
              slimCountdown ? "text-left" : "text-center",
            )}
          >
            {countdownFocus && (
              <p className="mb-2 text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
                {shop.name}
              </p>
            )}
            <p
              className={cn(
                "font-medium uppercase tracking-widest opacity-90",
                countdownFocus ? "text-sm sm:text-base" : slimCountdown ? "text-xs" : "text-sm",
              )}
            >
              Drop opens in
            </p>
            <div
              className={cn(
                "mt-1 font-bold tabular-nums",
                countdownFocus
                  ? "mt-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                  : slimCountdown
                    ? "text-xl"
                    : "text-2xl",
              )}
            >
              <Countdown
                startAt={shop.start_at}
                endAt={shop.end_at}
                compact
                className={cn(
                  countdownFocus && "text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white",
                  slimCountdown && "text-xl text-white",
                  !countdownFocus && !slimCountdown && "text-2xl text-white",
                )}
              />
            </div>
          </div>
        </div>
      )}
      {countdownOpen && !isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <p className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            We&apos;re open
          </p>
        </div>
      )}
      {isOpen && !isLive && !isOwner && (
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
