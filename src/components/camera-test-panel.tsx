"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Video, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MediaDevice = { deviceId: string; label: string };

function mediaAccessErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Camera or microphone access was blocked. Click the lock icon in your browser’s address bar and allow camera + microphone for this site, then try again.";
      case "NotFoundError":
        return "No camera or microphone was found. Connect a device and try again.";
      case "NotReadableError":
        return "Your camera or microphone is in use by another app. Close other apps (Zoom, FaceTime, etc.) and try again.";
      case "SecurityError":
        return "Camera access requires a secure connection (HTTPS). Open this site via https:// and try again.";
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

export function CameraTestPanel({ disabled }: { disabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [cameraId, setCameraId] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTesting(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const startTest = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(mediaAccessErrorMessage(null));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: true,
      });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" })),
      );
      setTesting(true);
    } catch (err) {
      console.error("CameraTestPanel getUserMedia failed", err);
      setError(mediaAccessErrorMessage(err));
    }
  }, [cameraId, muted]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  async function switchCamera(nextId: string) {
    setCameraId(nextId);
    stop();
    // Re-request with updated device id on next tick after state would apply.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: nextId ? { deviceId: { exact: nextId } } : true,
        audio: true,
      });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setTesting(true);
    } catch (err) {
      setError(mediaAccessErrorMessage(err));
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Camera &amp; mic test</Label>
        {testing ? (
          <Button type="button" variant="outline" size="sm" onClick={stop}>
            Stop test
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => void startTest()} disabled={disabled}>
            <Video className="size-4" /> Test camera
          </Button>
        )}
      </div>

      {testing && (
        <>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          </div>
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
          <p className="text-xs text-muted-foreground">
            Only you can see this preview. Buyers still see your cover photo until you go live.
          </p>
        </>
      )}

      {error && <p className={cn("text-sm text-live")}>{error}</p>}
    </div>
  );
}
