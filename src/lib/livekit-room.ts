import type { Room } from "livekit-client";

/**
 * Tear down a LiveKit room without letting disconnect rejections surface as
 * unhandled promise rejections. On flaky mobile / in-app browsers, LiveKit's
 * websocket close path often rejects with a raw DOM `Event` (no stack).
 */
export async function safeDisconnectLiveKitRoom(room: Room | null | undefined): Promise<void> {
  if (!room) return;
  try {
    room.removeAllListeners();
  } catch {
    // ignore
  }
  try {
    await room.disconnect();
  } catch {
    // Expected on ping-timeout / WS 1006 paths — not an app bug.
  }
}
