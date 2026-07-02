"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StreamSourcePicker } from "@/components/stream-source-picker";
import { PanelSection } from "@/components/studio/panel-ui";
import type { ShopWizardDraft } from "@/lib/shop-wizard";

/** Live stream setup: PopUp Live or an external YouTube/Twitch embed. */
export function StudioStreamPanel({
  draft,
  onPatch,
  nativeLiveEnabled,
}: {
  draft: ShopWizardDraft;
  onPatch: (partial: Partial<ShopWizardDraft>) => void;
  nativeLiveEnabled: boolean;
}) {
  return (
    <div className="space-y-7">
      <PanelSection
        title="Going live"
        description="Optional, but drops with a live host sell more. You can change this anytime."
      >
        <StreamSourcePicker
          value={draft.streamSource}
          onChange={(streamSource) =>
            onPatch({
              streamSource,
              ...(streamSource === "native" ? { youtubeUrl: "", twitchUrl: "" } : {}),
            })
          }
          nativeEnabled={nativeLiveEnabled}
        />
      </PanelSection>

      {draft.streamSource === "external" && (
        <PanelSection title="Stream links" description="Add one or both. Buyers watch right on your shop page.">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="studio-youtube-url">YouTube stream URL</Label>
              <Input
                id="studio-youtube-url"
                type="url"
                value={draft.youtubeUrl}
                onChange={(e) => onPatch({ youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-twitch-url">Twitch stream URL</Label>
              <Input
                id="studio-twitch-url"
                type="url"
                value={draft.twitchUrl}
                onChange={(e) => onPatch({ twitchUrl: e.target.value })}
                placeholder="https://twitch.tv/yourchannel"
              />
            </div>
          </div>
        </PanelSection>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        You can go live anytime while your shop is open. Test your camera from the manage page
        before the drop starts.
      </p>
    </div>
  );
}
