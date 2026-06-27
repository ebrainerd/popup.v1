"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import type { StreamProvider } from "@/lib/database.types";
import { updateStreamSource } from "@/app/dashboard/actions";
import {
  effectiveStreamProvider,
  getStreamSourceLabel,
  providerToStreamChoice,
  type StreamSourceChoice,
} from "@/lib/live-stream";
import { StreamSourcePicker } from "@/components/stream-source-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StreamSourceSettings({
  shopId,
  streamProvider,
  liveUrl,
  twitchUrl,
  nativeEnabled,
  isLive,
}: {
  shopId: string;
  streamProvider: StreamProvider;
  liveUrl: string | null;
  twitchUrl: string | null;
  nativeEnabled: boolean;
  isLive: boolean;
}) {
  const router = useRouter();
  const provider = effectiveStreamProvider({
    stream_provider: streamProvider,
    live_url: liveUrl,
    twitch_url: twitchUrl,
  });
  const initialChoice = providerToStreamChoice(
    provider,
    Boolean(liveUrl?.trim() || twitchUrl?.trim()),
  );

  const [editing, setEditing] = useState(false);
  const [streamSource, setStreamSource] = useState<StreamSourceChoice>(initialChoice);
  const [youtubeUrl, setYoutubeUrl] = useState(liveUrl ?? "");
  const [twitchUrlState, setTwitchUrlState] = useState(twitchUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openEditor() {
    setStreamSource(initialChoice);
    setYoutubeUrl(liveUrl ?? "");
    setTwitchUrlState(twitchUrl ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateStreamSource(shopId, {
        streamSource,
        youtubeUrl: streamSource === "external" ? youtubeUrl : "",
        twitchUrl: streamSource === "external" ? twitchUrlState : "",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
        <StreamSourcePicker
          value={streamSource}
          onChange={(next) => {
            setStreamSource(next);
            if (next === "native") {
              setYoutubeUrl("");
              setTwitchUrlState("");
            }
          }}
          nativeEnabled={nativeEnabled}
        />

        {streamSource === "external" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stream_youtube">YouTube stream URL</Label>
              <Input
                id="stream_youtube"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stream_twitch">Twitch stream URL</Label>
              <Input
                id="stream_twitch"
                type="url"
                value={twitchUrlState}
                onChange={(e) => setTwitchUrlState(e.target.value)}
                placeholder="https://twitch.tv/yourchannel"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add at least one URL. Buyers see an embedded player when you go live.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save stream source"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-sm text-live">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-start gap-3">
        <Radio className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Live stream source</p>
          <p className="text-sm text-muted-foreground">{getStreamSourceLabel(provider)}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openEditor}
        disabled={isLive}
        title={isLive ? "End your live stream before changing source" : undefined}
      >
        Change live stream source
      </Button>
    </div>
  );
}
