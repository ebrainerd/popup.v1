"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Loader2 } from "lucide-react";
import {
  Room,
  RoomEvent,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import { startNativeLive, endNativeLive, acceptNativeLiveTos } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { broadcastLiveState } from "@/lib/live-broadcast-client";

type PublisherState = "idle" | "connecting" | "live" | "error";

export function NativeLivePublisher({
  shopId,
  initialIsLive,
  needsTosAcceptance,
  disabled,
}: {
  shopId: string;
  initialIsLive: boolean;
  needsTosAcceptance: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PublisherState>(initialIsLive ? "live" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [showTos, setShowTos] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [pending, setPending] = useState(false);
  const liveStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialIsLive && liveStartedRef.current === null) {
      liveStartedRef.current = Date.now();
      setState("live");
    }
  }, [initialIsLive]);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
      roomRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (state !== "live" || !liveStartedRef.current) return;
    const id = window.setInterval(() => {
      setLiveSeconds(Math.floor((Date.now() - liveStartedRef.current!) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => () => {
    void disconnect();
  }, [disconnect]);

  async function connectAndPublish() {
    setError(null);
    setState("connecting");
    setPending(true);
    try {
      const tokenRes = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, role: "publisher" }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error ?? "Could not get stream token.");

      const liveRes = await startNativeLive(shopId);
      if (liveRes.error) throw new Error(liveRes.error);

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, () => {});
      room.on(RoomEvent.Disconnected, () => {
        if (state === "live") setState("idle");
      });

      await room.connect(tokenData.livekitUrl, tokenData.token);
      const videoTrack = await createLocalVideoTrack();
      const audioTrack = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      if (videoRef.current) {
        videoTrack.attach(videoRef.current);
      }

      liveStartedRef.current = Date.now();
      setLiveSeconds(0);
      setState("live");
      void broadcastLiveState(shopId, { isLive: true, streamProvider: "native" });
      router.refresh();
    } catch (err) {
      await disconnect();
      await endNativeLive(shopId);
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to go live.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoLive() {
    if (needsTosAcceptance) {
      setShowTos(true);
      return;
    }
    await connectAndPublish();
  }

  async function handleAcceptTos() {
    const res = await acceptNativeLiveTos(shopId);
    if (res.error) {
      setError(res.error);
      return;
    }
    setShowTos(false);
    await connectAndPublish();
  }

  async function handleEndLive() {
    setPending(true);
    setError(null);
    try {
      await disconnect();
      const res = await endNativeLive(shopId);
      if (res.error) throw new Error(res.error);
      liveStartedRef.current = null;
      setState("idle");
      setLiveSeconds(0);
      void broadcastLiveState(shopId, { isLive: false, streamProvider: "native" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end live.");
    } finally {
      setPending(false);
    }
  }

  const timer = formatLiveTimer(liveSeconds);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {state === "live" || state === "connecting" ? (
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Camera preview appears here when you go live
          </div>
        )}
        {state === "live" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
            <Radio className="size-3 text-live animate-live-pulse" />
            LIVE · {timer}
          </div>
        )}
        {state === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2 text-sm">Starting live…</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Ending live stops video only. Your shop stays open for chat and sales.
      </p>

      <div className="flex flex-wrap gap-2">
        {state === "live" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleEndLive}
            disabled={pending || disabled}
          >
            End live
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleGoLive}
            disabled={pending || disabled || state === "connecting"}
          >
            {state === "connecting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radio className="size-4" />
            )}
            Go live
          </Button>
        )}
      </div>

      {error && <p className={cn("text-sm text-live")}>{error}</p>}

      {showTos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Before you go live</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You are responsible for the content you stream. Make sure you have the rights to show
              anything on camera, and follow PopUp&apos;s terms of service.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTos(false)}>
                Cancel
              </Button>
              <Button onClick={handleAcceptTos}>I understand — go live</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLiveTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
