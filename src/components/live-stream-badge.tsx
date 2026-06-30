"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useShopEvent } from "@/components/shop-room";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";

/** Tracks live state from Realtime so the shop header can show LIVE during a stream. */
export function LiveStreamBadge({ initialIsLive }: { initialIsLive: boolean }) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [prevInitial, setPrevInitial] = useState(initialIsLive);

  if (prevInitial !== initialIsLive) {
    setPrevInitial(initialIsLive);
    setIsLive(initialIsLive);
  }

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    const data = payload as LiveBroadcast;
    setIsLive(data.isLive);
  });

  if (!isLive) return null;

  return <Badge variant="live">LIVE</Badge>;
}
