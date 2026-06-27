"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Video, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MediaDevice = { deviceId: string; label: string };

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

  async function startTest() {
    setError(null);
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
    } catch {
      setError("Could not access camera or microphone. Check browser permissions.");
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
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
          <Button type="button" variant="outline" size="sm" onClick={startTest} disabled={disabled}>
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
                onChange={(e) => {
                  setCameraId(e.target.value);
                  stop();
                  void startTest();
                }}
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
