"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Loader2, Video, Mic, MicOff } from "lucide-react";
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

type PublisherState = "idle" | "preview" | "connecting" | "live" | "error";

type MediaDevice = { deviceId: string; label: string };

function mediaAccessErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Camera or microphone access was blocked. Click the lock icon in your browser’s address bar and allow camera + microphone for this site, then try again.";
      case "NotFoundError":
        return "No camera or microphone was found. Connect a device and try again.";
      case "NotReadableError":
        return "Your camera or microphone is in use by another app. Close other apps and try again.";
      case "SecurityError":
        return "Camera access requires HTTPS. Open this site via a secure URL and try again.";
      default:
        break;
    }
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera access requires HTTPS. Open this site via a secure URL and try again.";
  }
  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return "This browser does not support camera access here. Try Chrome or Firefox on desktop.";
  }
  return "Could not access camera or microphone. Check browser permissions and try again.";
}

export function NativeLivePublisher({
  shopId,
  initialIsLive,
  needsTosAcceptance,
  canGoLive,
  isEnded,
}: {
  shopId: string;
  initialIsLive: boolean;
  needsTosAcceptance: boolean;
  /** False when shop is not published/open yet. Preview still allowed. */
  canGoLive: boolean;
  isEnded: boolean;
}) {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<PublisherState>(initialIsLive ? "live" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [showTos, setShowTos] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [pending, setPending] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const liveStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialIsLive && liveStartedRef.current === null) {
      liveStartedRef.current = Date.now();
      setState("live");
    }
  }, [initialIsLive]);

  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
    if (state === "preview") setState("idle");
  }, [state]);

  const disconnectLive = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
      roomRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state === "preview" && previewStream) {
      video.srcObject = previewStream;
      void video.play().catch(() => {
        /* autoplay policy — preview is muted */
      });
      return;
    }

    if (state === "idle" || state === "error") {
      video.srcObject = null;
    }
  }, [state, previewStream]);

  useEffect(() => {
    if (state !== "live" || !liveStartedRef.current) return;
    const id = window.setInterval(() => {
      setLiveSeconds(Math.floor((Date.now() - liveStartedRef.current!) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      void disconnectLive();
    };
  }, [disconnectLive]);

  const startPreview = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(mediaAccessErrorMessage(null));
      return;
    }
    try {
      stopPreview();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: true,
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      previewStreamRef.current = stream;
      setPreviewStream(stream);
      setState("preview");

      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" })),
      );
    } catch (err) {
      console.error("NativeLivePublisher preview failed", err);
      setError(mediaAccessErrorMessage(err));
      setState("idle");
    }
  }, [cameraId, muted, stopPreview]);

  async function switchCamera(nextId: string) {
    setCameraId(nextId);
    setState("preview");
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: nextId ? { deviceId: { exact: nextId } } : true,
        audio: true,
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      previewStreamRef.current = stream;
      setPreviewStream(stream);
    } catch (err) {
      setError(mediaAccessErrorMessage(err));
      setState("idle");
      setPreviewStream(null);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    previewStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  async function connectAndPublish() {
    setError(null);
    stopPreview();
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

      room.on(RoomEvent.Disconnected, () => {
        setState((s) => (s === "live" ? "idle" : s));
      });

      await room.connect(tokenData.livekitUrl, tokenData.token);
      const videoTrack = await createLocalVideoTrack(
        cameraId ? { deviceId: cameraId } : undefined,
      );
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
      await disconnectLive();
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
      await disconnectLive();
      if (videoRef.current) videoRef.current.srcObject = null;
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
  const showVideo =
    state === "preview" || state === "connecting" || state === "live";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={cn("h-full w-full object-cover", !showVideo && "hidden")}
        />
        {state === "idle" && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <Video className="size-8 opacity-40" />
            <span>Test your camera or go live — buyers only see video when you&apos;re live.</span>
          </div>
        )}
        {state === "error" && (
          <div className="flex h-full min-h-[180px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Camera preview unavailable
          </div>
        )}
        {state === "preview" && (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            Preview — only you can see this
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

      {state === "preview" && (
        <div className="flex flex-wrap gap-2">
          {cameras.length > 1 && (
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={cameraId}
              onChange={(e) => void switchCamera(e.target.value)}
            >
              <option value="">Default camera</option>
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={toggleMute}>
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {muted ? "Unmute" : "Mute"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {state === "live" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleEndLive}
            disabled={pending}
          >
            End live
          </Button>
        ) : state === "preview" ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={stopPreview}>
              Stop preview
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGoLive}
              disabled={pending || !canGoLive || isEnded}
              title={!canGoLive ? "Publish and open your shop first" : undefined}
            >
              <Radio className="size-4" /> Go live
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void startPreview()}
              disabled={pending || isEnded}
            >
              <Video className="size-4" /> Test camera
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGoLive}
              disabled={pending || !canGoLive || isEnded || state === "connecting"}
            >
              {state === "connecting" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Radio className="size-4" />
              )}
              Go live
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {state === "live"
          ? "Ending live stops video only. Your shop stays open for chat and sales."
          : "Preview is private. Buyers see your cover photo until you go live."}
      </p>

      {!canGoLive && state !== "live" && (
        <p className="text-xs text-muted-foreground">
          Go live unlocks after you publish and your shop window is open.
        </p>
      )}

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
