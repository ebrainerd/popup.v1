"use client";

import { useCallback } from "react";
import type { StreamProvider } from "@/lib/database.types";
import { useShopRoomOptional } from "@/components/shop-room";
import { broadcastLiveState } from "@/lib/live-broadcast-client";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";

function toLiveBroadcastProvider(
  streamProvider: StreamProvider,
): LiveBroadcast["streamProvider"] {
  if (streamProvider === "native") return "native";
  if (streamProvider === "twitch") return "twitch";
  return "youtube";
}

/** Notify shop viewers (and self when inside ShopRoom) that live state changed. */
export function useBroadcastLiveState(shopId: string) {
  const room = useShopRoomOptional();

  return useCallback(
    (isLive: boolean, streamProvider: StreamProvider) => {
      const payload: LiveBroadcast = {
        isLive,
        liveUrl: null,
        streamProvider: toLiveBroadcastProvider(streamProvider),
      };
      room?.emit(ROOM_EVENTS.live, payload);
      void broadcastLiveState(shopId, {
        isLive,
        streamProvider: payload.streamProvider,
      });
    },
    [room, shopId],
  );
}
