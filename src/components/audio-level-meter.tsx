"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Visual mic input level for camera/mic test (no speaker playback). */
export function AudioLevelMeter({
  stream,
  muted,
}: {
  stream: MediaStream | null;
  muted: boolean;
}) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const displayLevel = !stream || muted ? 0 : level;

  useEffect(() => {
    if (!stream || muted) {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    let cancelled = false;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (cancelled) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      setLevel(Math.min(100, Math.round((avg / 128) * 100)));
      rafRef.current = requestAnimationFrame(tick);
    };
    void ctx.resume().then(() => {
      if (!cancelled) tick();
    });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      void ctx.close();
    };
  }, [stream, muted]);

  const bars = 12;
  const activeBars = Math.round((displayLevel / 100) * bars);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Mic level</span>
        <span>{muted ? "Muted" : displayLevel > 4 ? "Receiving audio" : "Speak to test"}</span>
      </div>
      <div
        className="flex h-6 items-end gap-0.5 rounded-md border border-border bg-background px-2 py-1"
        aria-label="Microphone level meter"
        role="meter"
        aria-valuenow={displayLevel}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-[height,background-color] duration-75",
              i < activeBars
                ? i >= bars - 3
                  ? "bg-live"
                  : "bg-primary"
                : "bg-muted",
            )}
            style={{ height: `${((i + 1) / bars) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
