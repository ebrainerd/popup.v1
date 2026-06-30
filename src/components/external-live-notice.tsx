"use client";

import { useState } from "react";
import { useShopEvent } from "@/components/shop-room";
import { LiveEmbed as LiveEmbedPlayer } from "@/components/live-embed";
import type { LiveEmbed as LiveEmbedInfo } from "@/lib/embeds";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";

type NonEmbeddableLive = Extract<NonNullable<LiveEmbedInfo>, { embeddable: false }>;

/** Off-platform live link shown only while the seller is live (updates without refresh). */
export function ExternalLiveNotice({
  embed,
  initialIsLive,
}: {
  embed: NonEmbeddableLive;
  initialIsLive: boolean;
}) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [prevInitialIsLive, setPrevInitialIsLive] = useState(initialIsLive);
  if (prevInitialIsLive !== initialIsLive) {
    setPrevInitialIsLive(initialIsLive);
    setIsLive(initialIsLive);
  }

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    setIsLive((payload as LiveBroadcast).isLive);
  });

  if (!isLive) return null;

  return (
    <div className="mb-8">
      <LiveEmbedPlayer embed={embed} />
    </div>
  );
}
