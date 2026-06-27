"use client";

import { createClient } from "@/lib/supabase/client";
import { ROOM_EVENTS, shopChannel, type LiveBroadcast } from "@/lib/realtime";

/** Notify connected shop viewers of live state (manage page has no ShopRoom). */
export async function broadcastLiveState(
  shopId: string,
  payload: Pick<LiveBroadcast, "isLive" | "streamProvider">,
): Promise<void> {
  try {
    const supabase = createClient();
    const channel = supabase.channel(shopChannel(shopId));
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("timeout")), 5000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
          resolve();
        }
      });
    });
    await channel.send({
      type: "broadcast",
      event: ROOM_EVENTS.live,
      payload: {
        isLive: payload.isLive,
        liveUrl: null,
        streamProvider: payload.streamProvider ?? "native",
      } satisfies LiveBroadcast,
    });
    await supabase.removeChannel(channel);
  } catch {
    // Best-effort; viewers can refresh or poll.
  }
}
