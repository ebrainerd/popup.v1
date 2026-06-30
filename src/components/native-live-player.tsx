"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Radio } from "lucide-react";
import { useShopEvent } from "@/components/shop-room";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";
import { getPublicLiveKitUrl } from "@/lib/live-stream";

export function NativeLivePlayer({
  shopId,
  initialIsLive,
}: {
  shopId: string;
  initialIsLive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [isLive, setIsLive] = useState(initialIsLive);
  const [prevInitialIsLive, setPrevInitialIsLive] = useState(initialIsLive);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  if (prevInitialIsLive !== initialIsLive) {
    setPrevInitialIsLive(initialIsLive);
    setIsLive(initialIsLive);
  }

  useShopEvent(ROOM_EVENTS.live, (payload) => {
    const data = payload as LiveBroadcast;
    setIsLive(data.isLive);
  });

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
      roomRef.current = null;
    }
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  useEffect(() => {
    if (!isLive) {
      void disconnect();
      return;
    }

    let cancelled = false;
    async function connect() {
      setConnecting(true);
      setError(null);
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, role: "subscriber" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not join stream.");

        const room = new Room({ adaptiveStream: true });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && containerRef.current) {
            const el = track.attach();
            el.className = "h-full w-full object-cover";
            containerRef.current.innerHTML = "";
            containerRef.current.appendChild(el);
          }
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.muted = muted;
            document.body.appendChild(el);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });

        await room.connect(data.livekitUrl ?? getPublicLiveKitUrl(), data.token);
        if (cancelled) await room.disconnect();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not play stream.");
          setIsLive(false);
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    }

    void connect();
    return () => {
      cancelled = true;
      void disconnect();
    };
  }, [isLive, shopId, disconnect, muted]);

  if (!isLive) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/60 bg-black glow-primary">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-live animate-live-pulse" />
          <span className="text-sm font-semibold uppercase tracking-wide text-live">Live</span>
        </div>
        <button
          type="button"
          className="text-xs text-white/80 underline-offset-2 hover:underline"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "Tap to unmute" : "Muted off"}
        </button>
      </div>
      <div className="relative aspect-video w-full bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
            Connecting…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
