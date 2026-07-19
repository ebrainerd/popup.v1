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
import { useBroadcastLiveState } from "@/hooks/use-broadcast-live-state";
import { AudioLevelMeter } from "@/components/audio-level-meter";
import { safeDisconnectLiveKitRoom } from "@/lib/livekit-room";

export type PublisherState = "idle" | "preview" | "connecting" | "live" | "error";

type MediaDevice = { deviceId: string; label: string };

function mediaAccessErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Camera or microphone access was blocked. Click the lock icon in your browser's address bar and allow camera + microphone for this site, then try again.";
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

function startedAtMs(nativeLiveStartedAt: string | null | undefined): number | null {
  if (!nativeLiveStartedAt) return null;
  const ms = new Date(nativeLiveStartedAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function NativeLivePublisher({
  shopId,
  initialIsLive,
  nativeLiveStartedAt,
  needsTosAcceptance,
  canGoLive,
  isEnded,
  embedded = false,
  slotMode = false,
  onStateChange,
}: {
  shopId: string;
  /** DB `shops.is_live` — cosmetic live badge; may differ from actual publishing. */
  initialIsLive: boolean;
  /** Server timestamp for accurate timer after refresh. */
  nativeLiveStartedAt?: string | null;
  needsTosAcceptance: boolean;
  /** False when shop is not published/open yet. Preview still allowed. */
  canGoLive: boolean;
  isEnded: boolean;
  /** Compact layout for the public shop page owner bar. */
  embedded?: boolean;
  /** Fills the shop stream column; cover shows through when idle. */
  slotMode?: boolean;
  onStateChange?: (state: PublisherState) => void;
}) {
  const router = useRouter();
  const broadcastLive = useBroadcastLiveState(shopId);
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const shouldAutoResume =
    initialIsLive && canGoLive && !needsTosAcceptance && !isEnded;

  const [state, setState] = useState<PublisherState>(() => {
    if (shouldAutoResume) return "connecting";
    return "idle";
  });
  const [error, setError] = useState<string | null>(null);
  const [showTos, setShowTos] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(() => {
    const fromServer = startedAtMs(nativeLiveStartedAt);
    return fromServer !== null ? Math.floor((Date.now() - fromServer) / 1000) : 0;
  });
  const [pending, setPending] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const liveStartedRef = useRef<number | null>(startedAtMs(nativeLiveStartedAt));
  const endingLiveRef = useRef(false);
  const unmountingRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);
  const resumeAttemptedRef = useRef(false);
  const intendsLiveRef = useRef(initialIsLive);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    intendsLiveRef.current = initialIsLive;
  }, [initialIsLive]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
    if (state === "preview") setState("idle");
  }, [state]);

  const disconnectLive = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    await safeDisconnectLiveKitRoom(room);
  }, []);

  const connectAndPublishTracks = useCallback(
    async (room: Room) => {
      const videoTrack = await createLocalVideoTrack(
        cameraId ? { deviceId: cameraId } : undefined,
      );
      const audioTrack = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      if (videoRef.current) {
        videoTrack.attach(videoRef.current);
      }
    },
    [cameraId],
  );

  const connectToRoomRef = useRef<
    (options: { markLiveInDb: boolean }) => Promise<void>
  >(async () => {});

  const connectToRoom = useCallback(
    async ({ markLiveInDb }: { markLiveInDb: boolean }) => {
      setError(null);
      stopPreview();
      setState("connecting");

      const tokenRes = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, role: "publisher" }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error ?? "Could not get stream token.");

      if (markLiveInDb) {
        const liveRes = await startNativeLive(shopId);
        if (liveRes.error) throw new Error(liveRes.error);
        liveStartedRef.current = Date.now();
        setLiveSeconds(0);
      } else {
        const fromServer = startedAtMs(nativeLiveStartedAt);
        if (fromServer !== null) {
          liveStartedRef.current = fromServer;
          setLiveSeconds(Math.floor((Date.now() - fromServer) / 1000));
        } else if (liveStartedRef.current === null) {
          liveStartedRef.current = Date.now();
          setLiveSeconds(0);
        }
      }

      await disconnectLive();

      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        if (endingLiveRef.current || unmountingRef.current) return;
        void (async () => {
          if (stateRef.current !== "live" && stateRef.current !== "connecting") return;

          await disconnectLive();

          if (
            !reconnectAttemptedRef.current &&
            intendsLiveRef.current &&
            !unmountingRef.current
          ) {
            reconnectAttemptedRef.current = true;
            setState("connecting");
            setError(null);
            try {
              await connectToRoomRef.current({ markLiveInDb: false });
              return;
            } catch (err) {
              console.error("NativeLivePublisher reconnect failed", err);
            }
          }

          setState("error");
          setError("Stream disconnected. Reconnect your camera or end live.");
        })();
      });

      await room.connect(tokenData.livekitUrl, tokenData.token);
      await connectAndPublishTracks(room);

      intendsLiveRef.current = true;
      reconnectAttemptedRef.current = false;
      setState("live");
      void broadcastLive(true, "native");
      if (markLiveInDb) {
        router.refresh();
      }
    },
    [
      shopId,
      nativeLiveStartedAt,
      stopPreview,
      disconnectLive,
      connectAndPublishTracks,
      broadcastLive,
      router,
    ],
  );

  useEffect(() => {
    connectToRoomRef.current = connectToRoom;
  }, [connectToRoom]);

  useEffect(() => {
    if (!shouldAutoResume || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    setPending(true);
    void (async () => {
      try {
        await connectToRoom({ markLiveInDb: false });
      } catch (err) {
        console.error("NativeLivePublisher resume failed", err);
        await disconnectLive();
        setState("error");
        setError(
          err instanceof Error ? err.message : "Could not resume your live stream.",
        );
      } finally {
        setPending(false);
      }
    })();
  }, [shouldAutoResume, connectToRoom, disconnectLive]);

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
    const showTimer =
      state === "live" || (initialIsLive && state === "connecting" && liveStartedRef.current);
    if (!showTimer || !liveStartedRef.current) return;
    const id = window.setInterval(() => {
      setLiveSeconds(Math.floor((Date.now() - liveStartedRef.current!) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, initialIsLive]);

  useEffect(() => {
    return () => {
      unmountingRef.current = true;
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
    setPending(true);
    try {
      await connectToRoom({ markLiveInDb: true });
    } catch (err) {
      await disconnectLive();
      await endNativeLive(shopId);
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to go live.");
    } finally {
      setPending(false);
    }
  }

  async function handleReconnect() {
    setPending(true);
    reconnectAttemptedRef.current = false;
    try {
      await connectToRoom({ markLiveInDb: false });
    } catch (err) {
      await disconnectLive();
      setState("error");
      setError(
        err instanceof Error ? err.message : "Could not reconnect your live stream.",
      );
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
    endingLiveRef.current = true;
    intendsLiveRef.current = false;
    try {
      await disconnectLive();
      if (videoRef.current) videoRef.current.srcObject = null;
      const res = await endNativeLive(shopId);
      if (res.error) throw new Error(res.error);
      liveStartedRef.current = null;
      setState("idle");
      setLiveSeconds(0);
      broadcastLive(false, "native");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end live.");
    } finally {
      endingLiveRef.current = false;
      setPending(false);
    }
  }

  const timer = formatLiveTimer(liveSeconds);
  const isPublishing = state === "live";
  const isResuming = state === "connecting" && initialIsLive;
  const showDbLiveBadge = isPublishing || isResuming;
  const showVideo = state === "preview" || state === "connecting" || state === "live";
  const phantomLive = initialIsLive && !isPublishing && !isResuming;
  const compact = embedded || slotMode;
  const embeddedIdle = compact && state === "idle" && !initialIsLive && !slotMode;

  const connectingLabel = isResuming ? "Resuming live…" : "Starting live…";

  const controlButtons = (
    <div className={cn("flex flex-wrap gap-2", slotMode && "justify-end")}>
      {state === "live" || isResuming ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleEndLive}
          disabled={pending}
        >
          End live
        </Button>
      ) : phantomLive ? (
        <>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleReconnect()}
            disabled={pending || isEnded}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
            Reconnect stream
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleEndLive}
            disabled={pending}
          >
            End live
          </Button>
        </>
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
            <Video className="size-4" /> Test camera & mic
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
  );

  const previewControls =
    state === "preview" ? (
      <div className="space-y-3">
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
        <AudioLevelMeter stream={previewStream} muted={muted} />
      </div>
    ) : null;

  if (slotMode) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col">
        <div className="relative min-h-0 flex-1">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className={cn("absolute inset-0 h-full w-full object-cover", !showVideo && "hidden")}
          />
          {state === "preview" && (
            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
              Preview — only you can see this
            </div>
          )}
          {showDbLiveBadge && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
              <Radio className="size-3 text-live animate-live-pulse" />
              LIVE · {timer}
            </div>
          )}
          {phantomLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-4 text-center text-white">
              <Radio className="size-6 text-live" />
              <p className="text-sm font-medium">You&apos;re live — reconnect your camera</p>
              <p className="text-xs text-white/80">Buyers can&apos;t see video until you reconnect.</p>
            </div>
          )}
          {state === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <Loader2 className="size-6 animate-spin" />
              <span className="ml-2 text-sm">{connectingLabel}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-3 pt-8">
          {previewControls}
          {controlButtons}
          {error && <p className="text-sm text-live">{error}</p>}
        </div>

        {showTos && <TosModal onCancel={() => setShowTos(false)} onAccept={handleAcceptTos} />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3",
        compact ? "" : "rounded-lg border border-border bg-muted/30 p-4",
      )}
    >
      {!embeddedIdle && (
      <div className={cn(
        "relative aspect-video overflow-hidden rounded-lg bg-black",
        embedded && "max-h-[220px]",
      )}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={cn("h-full w-full object-cover", !showVideo && "hidden")}
        />
        {state === "idle" && !phantomLive && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <Video className="size-8 opacity-40" />
            <span>Test your camera or go live — buyers only see video when you&apos;re live.</span>
          </div>
        )}
        {phantomLive && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <Radio className="size-8 text-live opacity-80" />
            <span className="font-medium text-foreground">You&apos;re live — reconnect your camera</span>
            <span>Buyers can&apos;t see video until you reconnect the stream.</span>
          </div>
        )}
        {state === "error" && !phantomLive && (
          <div className="flex h-full min-h-[180px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Camera preview unavailable
          </div>
        )}
        {state === "preview" && (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            Preview — only you can see this
          </div>
        )}
        {showDbLiveBadge && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
            <Radio className="size-3 text-live animate-live-pulse" />
            LIVE · {timer}
          </div>
        )}
        {state === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2 text-sm">{connectingLabel}</span>
          </div>
        )}
      </div>
      )}

      {embeddedIdle && (
        <p className="text-sm text-muted-foreground">
          Not live yet — buyers still see your cover photo until you go live.
        </p>
      )}

      {previewControls}

      {controlButtons}

      <p className="text-xs text-muted-foreground">
        {isPublishing
          ? "Ending live stops video only. Your shop stays open for chat and sales."
          : phantomLive
            ? "Your shop is marked live but video isn't streaming. Reconnect or end live."
            : "Preview is private. Buyers see your cover photo until you go live."}
      </p>

      {!canGoLive && state !== "live" && !phantomLive && (
        <p className="text-xs text-muted-foreground">
          Go live unlocks after you publish and your shop window is open.
        </p>
      )}

      {error && <p className={cn("text-sm text-live")}>{error}</p>}

      {showTos && <TosModal onCancel={() => setShowTos(false)} onAccept={handleAcceptTos} />}
    </div>
  );
}

function TosModal({
  onCancel,
  onAccept,
}: {
  onCancel: () => void;
  onAccept: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Before you go live</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You are responsible for the content you stream. Make sure you have the rights to show
          anything on camera, and follow PopUp&apos;s terms of service.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onAccept}>I understand — go live</Button>
        </div>
      </div>
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
