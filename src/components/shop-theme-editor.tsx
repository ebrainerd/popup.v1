"use client";

import { useState, useTransition } from "react";
import { Monitor, Smartphone } from "lucide-react";
import {
  SHOP_BACKGROUND_META,
  SHOP_BACKGROUND_STYLES,
  SHOP_LAYOUT_MODE_META,
  SHOP_LAYOUT_MODES,
  SHOP_THEME_PRESET_META,
  SHOP_THEME_PRESETS,
  presetAccent,
  type ShopBackgroundStyle,
  validateShopThemeContrast,
  type ShopTheme,
  type ShopThemePreset,
} from "@/lib/shop-theme";
import { ShopThemePreview } from "@/components/shop-theme-preview";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardProductDraft } from "@/lib/shop-wizard";

type PreviewProduct = {
  title: string;
  price: string;
  photoUrl?: string;
};

export function ShopThemeEditor({
  theme,
  shopName,
  coverUrl,
  products,
  onChange,
  onSave,
  saveLabel = "Save appearance",
  showSave = false,
}: {
  theme: ShopTheme;
  shopName: string;
  coverUrl: string;
  products: PreviewProduct[] | WizardProductDraft[];
  onChange: (theme: ShopTheme) => void;
  onSave?: () => Promise<void> | void;
  saveLabel?: string;
  showSave?: boolean;
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [pending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const previewProducts: PreviewProduct[] = products.map((p) =>
    "auctionFields" in p
      ? {
          title: p.title,
          price: p.price || p.auctionFields.startingBid || "0",
          photoUrl: p.photo_urls[0],
        }
      : p,
  );

  const contrastWarnings = validateShopThemeContrast(theme);

  function patch(partial: Partial<ShopTheme>) {
    onChange({ ...theme, ...partial });
    setSaveMessage(null);
  }

  function selectPreset(preset: ShopThemePreset) {
    onChange({
      ...theme,
      preset,
      accent: presetAccent(preset),
    });
    setSaveMessage(null);
  }

  function handleSave() {
    if (!onSave) return;
    startTransition(async () => {
      try {
        await onSave();
        setSaveMessage("Appearance saved.");
      } catch {
        setSaveMessage(null);
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start">
      {/* Controls — ~1/3 */}
      <div className="space-y-8 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
        <section className="space-y-3">
          <SectionHeader
            title="Color theme"
            description="Sets your page background, card style, and typography. Each theme looks distinctly different in the preview."
          />
          {contrastWarnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-highlight/40 bg-highlight/10 px-3 py-2 text-sm">
              {contrastWarnings.map((w) => (
                <p key={w.id} className="text-foreground">{w.message}</p>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {SHOP_THEME_PRESETS.map((id) => {
              const preset = SHOP_THEME_PRESET_META[id];
              const active = theme.preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPreset(id)}
                  className={cn(
                    "flex w-full gap-3 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <div
                    className="h-14 w-14 shrink-0 rounded-lg border border-black/10 shadow-inner"
                    style={{ background: preset.swatch }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{preset.label}</p>
                    <p className="text-xs font-medium text-primary">{preset.tagline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Page layout"
            description="Controls what buyers see first — banner, products, chat, or countdown."
          />
          <div className="space-y-2">
            {SHOP_LAYOUT_MODES.map((id) => {
              const layout = SHOP_LAYOUT_MODE_META[id];
              const active = theme.layout === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ layout: id })}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <p className="font-semibold">{layout.label}</p>
                  <p className="text-xs font-medium text-primary">{layout.tagline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{layout.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
          <SectionHeader
            title="Fine tuning"
            description="Accent color and background wash apply on top of your chosen theme."
          />

          <div className="space-y-2">
            <Label htmlFor="accent">Accent color</Label>
            <p className="text-xs text-muted-foreground">
              Used for buttons, prices, live badges, and background glows.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="accent"
                type="color"
                value={theme.accent}
                onChange={(e) => patch({ accent: e.target.value })}
                className="size-11 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <span className="font-mono text-sm">{theme.accent}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => patch({ accent: presetAccent(theme.preset) })}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Page background</Label>
            <div className="space-y-2">
              {SHOP_BACKGROUND_STYLES.map((style) => {
                const meta = SHOP_BACKGROUND_META[style];
                const active = theme.background === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => patch({ background: style as ShopBackgroundStyle })}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm",
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                    )}
                  >
                    <p className="font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Products per row (desktop)</Label>
            <p className="text-xs text-muted-foreground">How many product cards appear side by side on wide screens.</p>
            <div className="flex gap-2">
              {([2, 3] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => patch({ productGridColumns: cols })}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium",
                    theme.productGridColumns === cols
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {cols} columns
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="What buyers see"
            description="Hide sections you do not need — the preview updates instantly."
          />
          <div className="space-y-2">
            <ToggleRow
              label="Chat panel"
              description="Show the shop room chat (or announcements before open)."
              checked={theme.showChat}
              onChange={(showChat) => patch({ showChat })}
            />
            <ToggleRow
              label="Seller bio"
              description="Your @handle and shop description under the title."
              checked={theme.showSellerBio}
              onChange={(showSellerBio) => patch({ showSellerBio })}
            />
            <ToggleRow
              label="Reminder button"
              description="“Remind me” CTA for scheduled drops (best with Waiting room layout)."
              checked={theme.showReminderCta}
              onChange={(showReminderCta) => patch({ showReminderCta })}
            />
          </div>
        </section>

        {showSave && onSave && (
          <div className="sticky bottom-0 border-t border-border bg-background/95 pt-4 backdrop-blur">
            <Button type="button" className="w-full" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : saveLabel}
            </Button>
            {saveMessage && <p className="mt-2 text-center text-sm text-success">{saveMessage}</p>}
          </div>
        )}
      </div>

      {/* Preview — ~2/3 */}
      <div className="lg:sticky lg:top-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Live preview</h3>
            <p className="text-sm text-muted-foreground">
              Changes update instantly. This is how buyers will see your drop page.
            </p>
          </div>
          <div className="flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                viewport === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Monitor className="size-4" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                viewport === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Smartphone className="size-4" /> Mobile
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-[420px] items-start justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:p-8",
            viewport === "mobile" && "items-center",
          )}
        >
          <ShopThemePreview
            theme={theme}
            shopName={shopName}
            coverUrl={coverUrl}
            products={previewProducts}
            viewport={viewport}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
    </label>
  );
}
