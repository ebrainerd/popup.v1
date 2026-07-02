"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import { VisibilityPicker } from "@/components/visibility-picker";
import { PanelSection } from "@/components/studio/panel-ui";
import type { ShopWizardDraft } from "@/lib/shop-wizard";

/** Shop identity: name, story, banner, and (marketplace mode) visibility. */
export function StudioDetailsPanel({
  draft,
  onPatch,
  inviteOnly,
}: {
  draft: ShopWizardDraft;
  onPatch: (partial: Partial<ShopWizardDraft>) => void;
  inviteOnly: boolean;
}) {
  return (
    <div className="space-y-7">
      <PanelSection
        title="Shop name"
        description="Front and center on your page, so make it yours."
      >
        <Input
          id="studio-shop-name"
          maxLength={120}
          value={draft.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="Summer sticker drop"
        />
      </PanelSection>

      <PanelSection
        title="Description"
        description="Tell buyers what makes this drop special."
      >
        <Textarea
          id="studio-shop-description"
          rows={4}
          value={draft.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Hand-poured candles in small batches. Once they're gone, they're gone."
        />
      </PanelSection>

      <PanelSection
        title="Banner image"
        description="Shown at the top of your shop when you're not live."
      >
        <ImageUpload
          key={draft.coverUrl || "empty-cover"}
          name="cover_url"
          bucket="covers"
          defaultValue={draft.coverUrl}
          cropAspect={16 / 6}
          onChange={(coverUrl) => onPatch({ coverUrl })}
          label="Upload or drag a banner image here"
        />
      </PanelSection>

      {!inviteOnly && (
        <PanelSection title="Visibility">
          <VisibilityPicker
            visibility={draft.visibility}
            onChange={(visibility) => onPatch({ visibility })}
          />
        </PanelSection>
      )}

      <div className="space-y-1 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
        <p className="text-xs font-medium">Drop schedule comes later</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Set your open and close times from the manage page when you&apos;re ready to publish.
        </p>
      </div>
    </div>
  );
}
