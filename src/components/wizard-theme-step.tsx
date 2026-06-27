"use client";

import {
  SHOP_BACKGROUND_STYLES,
  SHOP_LAYOUT_MODE_META,
  SHOP_LAYOUT_MODES,
  SHOP_THEME_PRESET_META,
  SHOP_THEME_PRESETS,
  accentForPreset,
  type ShopBackgroundStyle,
  type ShopTheme,
  type ShopThemePreset,
} from "@/lib/shop-theme";
import { ShopThemePreview } from "@/components/shop-theme-preview";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WizardProductDraft } from "@/lib/shop-wizard";

export function WizardThemeStep({
  theme,
  shopName,
  coverUrl,
  products,
  onChange,
}: {
  theme: ShopTheme;
  shopName: string;
  coverUrl: string;
  products: WizardProductDraft[];
  onChange: (theme: ShopTheme) => void;
}) {
  const previewProducts = products.map((p) => ({
    title: p.title,
    price: p.price || p.auctionFields.startingBid || "0",
    photoUrl: p.photo_urls[0],
  }));

  function patch(partial: Partial<ShopTheme>) {
    onChange({ ...theme, ...partial });
  }

  function selectPreset(preset: ShopThemePreset) {
    onChange({
      ...theme,
      preset,
      accent: accentForPreset(preset, theme.accent),
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-8">
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Theme preset</h3>
            <p className="text-sm text-muted-foreground">
              Pick a look that matches your brand. You can fine-tune the accent color below.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHOP_THEME_PRESETS.map((id) => {
              const preset = SHOP_THEME_PRESET_META[id];
              const active = theme.preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPreset(id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div
                    className="mb-3 h-10 rounded-lg"
                    style={{ background: preset.swatch }}
                    aria-hidden
                  />
                  <p className="font-medium">{preset.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Layout</h3>
            <p className="text-sm text-muted-foreground">
              Choose how your shop page is structured for buyers.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SHOP_LAYOUT_MODES.map((id) => {
              const layout = SHOP_LAYOUT_MODE_META[id];
              const active = theme.layout === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ layout: id })}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">{layout.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{layout.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accent">Accent color</Label>
            <div className="flex items-center gap-3">
              <input
                id="accent"
                type="color"
                value={theme.accent}
                onChange={(e) => patch({ accent: e.target.value })}
                className="size-10 cursor-pointer rounded-md border border-border bg-transparent"
              />
              <span className="font-mono text-sm text-muted-foreground">{theme.accent}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="flex flex-wrap gap-2">
              {SHOP_BACKGROUND_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => patch({ background: style as ShopBackgroundStyle })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                    theme.background === style
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product grid</Label>
            <div className="flex gap-2">
              {([2, 3] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => patch({ productGridColumns: cols })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    theme.productGridColumns === cols
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {cols} columns
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Visibility</h3>
          <div className="space-y-2">
            <ToggleRow
              label="Show chat panel"
              description="Display the shop room chat alongside products."
              checked={theme.showChat}
              onChange={(showChat) => patch({ showChat })}
            />
            <ToggleRow
              label="Show seller bio"
              description="Display your profile link and shop description."
              checked={theme.showSellerBio}
              onChange={(showSellerBio) => patch({ showSellerBio })}
            />
            <ToggleRow
              label="Show reminder CTA"
              description="Prompt visitors to get reminded before the drop opens."
              checked={theme.showReminderCta}
              onChange={(showReminderCta) => patch({ showReminderCta })}
            />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <div className="hidden xl:block">
          <p className="mb-2 text-sm font-medium">Desktop preview</p>
          <ShopThemePreview
            theme={theme}
            shopName={shopName}
            coverUrl={coverUrl}
            products={previewProducts}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Mobile preview</p>
          <ShopThemePreview
            theme={theme}
            shopName={shopName}
            coverUrl={coverUrl}
            products={previewProducts}
            mobile
          />
        </div>
      </div>
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
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 accent-primary"
      />
    </label>
  );
}
