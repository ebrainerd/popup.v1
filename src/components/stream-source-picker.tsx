"use client";

import { Globe, Radio } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { StreamSourceChoice } from "@/lib/live-stream";

export function StreamSourcePicker({
  value,
  onChange,
  nativeEnabled,
}: {
  value: StreamSourceChoice;
  onChange: (v: StreamSourceChoice) => void;
  nativeEnabled: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <Label>How do you want to go live?</Label>
      <div className="grid gap-3">
        <button
          type="button"
          disabled={!nativeEnabled}
          onClick={() => onChange("native")}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border p-4 text-left",
            value === "native" && "border-primary bg-primary/5",
            !nativeEnabled && "opacity-60",
          )}
        >
          <Radio className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="block font-medium">PopUp Live (recommended)</span>
            <span className="text-sm text-muted-foreground">
              Stream from your camera right in the app. No extra links needed.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("external")}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border p-4 text-left",
            value === "external" && "border-primary bg-primary/5",
          )}
        >
          <Globe className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="block font-medium">YouTube or Twitch</span>
            <span className="text-sm text-muted-foreground">
              Paste a stream URL. Viewers watch an embedded player.
            </span>
          </span>
        </button>
      </div>
      {!nativeEnabled && (
        <p className="text-xs text-muted-foreground">
          PopUp Live will be available once streaming is configured for this environment.
        </p>
      )}
    </fieldset>
  );
}
