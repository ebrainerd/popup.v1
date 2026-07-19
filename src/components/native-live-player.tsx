"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { Radio } from "lucide-react";
import { useShopEvent } from "@/components/shop-room";
import { ROOM_EVENTS, type LiveBroadcast } from "@/lib/realtime";
import { getPublicLiveKitUrl } from "@/lib/live-stream";
import { safeDisconnectLiveKitRoom } from "@/lib/livekit-room";
import { cn } from "@/lib/utils";

function mutedStorageKey(shopId: string) {
  return `popup:stream-muted:${shopId}`;
}

function readStoredMuted(shopId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = sessionStorage.getItem(mutedStorageKey(shopId));
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    // sessionStorage unavailable (private mode quirks) — stay muted.
  }
  return true;
}

function writeStoredMuted(shopId: string, muted: boolean) {
  try {
    sessionStorage.setItem(mutedStorageKey(shopId), muted ? "1" : "0");
  } catch {
    // ignore
  }
}

function applyMutedToShopAudio(shopId: string, muted: boolean) {
  document
    .querySelectorAll<HTMLMediaElement>(`audio[data-popup-live-audio="${shopId}"]`)
    .forEach((el) => {
      el.muted = muted;
    });
}

function clearAttachedMedia(shopId: string, container: HTMLDivElement | null) {
  if (container) container.innerHTML = "";
  document
    .querySelectorAll(`audio[data-popup-live-audio="${shopId}"]`)
    .forEach((el) => el.remove());
}

export function NativeLivePlayer({
  shopId,
  initialIsLive,
  fillHeight = false,
}: {
  shopId: string;
  initialIsLive: boolean;
  /** Fill the parent's height on desktop (chat-sidebar rows) instead of 16:9. */
  fillHeight?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const mutedRef = useRef(true);
  const connectGenerationRef = useRef(0);
  const [isLive, setIsLive] = useState(initialIsLive);
  const [prevInitialIsLive, setPrevInitialIsLive] = useState(initialIsLive);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  // Restore mute preference after mount so SSR stays muted (autoplay-safe).
  useEffect(() => {
    queueMicrotask(() => {
      const stored = readStoredMuted(shopId);
      mutedRef.current = stored;
      setMuted(stored);
    });
  }, [shopId]);

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
    roomRef.current = null;
    await safeDisconnectLiveKitRoom(room);
    clearAttachedMedia(shopId, containerRef.current);
  }, [shopId]);

  // Toggle mute on attached elements only — never tear down the LiveKit room.
  useEffect(() => {
    mutedRef.current = muted;
    writeStoredMuted(shopId, muted);
    applyMutedToShopAudio(shopId, muted);
  }, [muted, shopId]);

  useEffect(() => {
    if (!isLive) {
      void disconnect();
      return;
    }

    const generation = ++connectGenerationRef.current;
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
        if (cancelled || generation !== connectGenerationRef.current) return;

        await disconnect();
        if (cancelled || generation !== connectGenerationRef.current) return;

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
            el.dataset.popupLiveAudio = shopId;
            el.muted = mutedRef.current;
            document.body.appendChild(el);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });

        // LiveKit reconnects internally; surface status instead of letting
        // websocket Event rejections look like app crashes.
        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          if (cancelled || generation !== connectGenerationRef.current) return;
          if (
            state === ConnectionState.Connecting ||
            state === ConnectionState.Reconnecting ||
            state === ConnectionState.SignalReconnecting
          ) {
            setConnecting(true);
          } else if (state === ConnectionState.Connected) {
            setConnecting(false);
            setError(null);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (cancelled || generation !== connectGenerationRef.current) return;
          setConnecting(false);
          setError("Stream interrupted. Tap to retry.");
        });

        await room.connect(data.livekitUrl ?? getPublicLiveKitUrl(), data.token);
        if (cancelled || generation !== connectGenerationRef.current) {
          await safeDisconnectLiveKitRoom(room);
          if (roomRef.current === room) roomRef.current = null;
        }
      } catch (err) {
        if (!cancelled && generation === connectGenerationRef.current) {
          setError(err instanceof Error ? err.message : "Could not play stream.");
        }
      } finally {
        if (!cancelled && generation === connectGenerationRef.current) {
          setConnecting(false);
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
      void disconnect();
    };
  }, [isLive, shopId, disconnect, reconnectKey]);

  if (!isLive) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-primary/60 bg-black glow-primary",
        fillHeight && "lg:flex lg:h-full lg:flex-col",
      )}
    >
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
      <div
        className={cn(
          "relative aspect-video w-full bg-black",
          fillHeight && "lg:aspect-auto lg:min-h-0 lg:flex-1",
        )}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
            Connecting…
          </div>
        )}
        {error && !connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-4 text-center text-sm text-white">
            <p>{error}</p>
            <button
              type="button"
              className="rounded-md border border-white/40 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
              onClick={() => {
                setError(null);
                setReconnectKey((k) => k + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
