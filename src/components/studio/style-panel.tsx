"use client";

import { Check, RotateCcw } from "lucide-react";
import {
  SHOP_BACKGROUND_META,
  SHOP_BACKGROUND_STYLES,
  SHOP_THEME_PRESET_META,
  SHOP_THEME_PRESETS,
  presetAccent,
  validateShopThemeContrast,
  type ShopTheme,
  type ShopThemePreset,
} from "@/lib/shop-theme";
import { PanelSection, PanelToggleRow, Segmented } from "@/components/studio/panel-ui";
import { cn } from "@/lib/utils";

/** Quick accent swatches: brand colors plus each preset's signature accent. */
const ACCENT_SWATCHES = ["#ff3b8b", "#00e6c8", "#ffd60a", "#2d4ff2", "#e4572e", "#16a34a"];

/**
 * Theme controls for the studio side panel (no preview: the canvas has it).
 * Every shop uses The Room layout, so there is no layout picker.
 */
export function StudioStylePanel({
  theme,
  onChange,
}: {
  theme: ShopTheme;
  onChange: (theme: ShopTheme) => void;
}) {
  const contrastWarnings = validateShopThemeContrast(theme);

  function patch(partial: Partial<ShopTheme>) {
    onChange({ ...theme, ...partial });
  }

  function selectPreset(preset: ShopThemePreset) {
    onChange({ ...theme, preset, accent: presetAccent(preset) });
  }

  return (
    <div className="space-y-7">
      <PanelSection
        title="Theme"
        description="Sets your page background, cards, and type. Your accent color applies on top."
      >
        <div className="grid grid-cols-2 gap-2">
          {SHOP_THEME_PRESETS.map((id) => {
            const preset = SHOP_THEME_PRESET_META[id];
            const active = theme.preset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectPreset(id)}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-xl border text-left transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="h-14 w-full" style={{ background: preset.swatch }} aria-hidden />
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold leading-tight">{preset.label}</p>
                  <p className="text-[11px] text-muted-foreground">{preset.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
        {contrastWarnings.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-highlight/40 bg-highlight/10 px-3 py-2">
            {contrastWarnings.map((w) => (
              <p key={w.id} className="text-xs leading-relaxed text-foreground">
                {w.message}
              </p>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Accent color"
        description="Buttons, prices, live badges, and background glow."
      >
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => patch({ accent: color })}
              className={cn(
                "size-8 rounded-full border border-black/10 transition-transform hover:scale-110",
                theme.accent.toLowerCase() === color.toLowerCase() &&
                  "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
              style={{ background: color }}
              aria-label={`Accent ${color}`}
            />
          ))}
          <label
            className="relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border"
            title="Custom color"
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "conic-gradient(#ff3b8b, #ffd60a, #00e6c8, #2d4ff2, #ff3b8b)",
              }}
            />
            <input
              type="color"
              value={theme.accent}
              onChange={(e) => patch({ accent: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom accent color"
            />
          </label>
          <button
            type="button"
            onClick={() => patch({ accent: presetAccent(theme.preset) })}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{theme.accent}</p>
      </PanelSection>

      <PanelSection title="Page background">
        <Segmented
          size="sm"
          options={SHOP_BACKGROUND_STYLES.map((style) => ({
            value: style,
            label: SHOP_BACKGROUND_META[style].label,
            title: SHOP_BACKGROUND_META[style].description,
          }))}
          value={theme.background}
          onChange={(background) => patch({ background })}
        />
        <p className="text-xs text-muted-foreground">
          {SHOP_BACKGROUND_META[theme.background].description}
        </p>
      </PanelSection>

      <PanelSection title="Products per row" description="On desktop screens.">
        <Segmented
          size="sm"
          options={[
            { value: 2 as const, label: "2 columns" },
            { value: 3 as const, label: "3 columns" },
          ]}
          value={theme.productGridColumns}
          onChange={(productGridColumns) => patch({ productGridColumns })}
        />
      </PanelSection>

      <PanelSection title="Page sections" description="Hide anything you don't need.">
        <div className="space-y-2">
          <PanelToggleRow
            label="Chat"
            description="The shop room chat while you're open."
            checked={theme.showChat}
            onChange={(showChat) => patch({ showChat })}
          />
          <PanelToggleRow
            label="Seller bio"
            description="Your @handle and description up top."
            checked={theme.showSellerBio}
            onChange={(showSellerBio) => patch({ showSellerBio })}
          />
          <PanelToggleRow
            label="Reminder button"
            description="A 'Remind me' CTA before you open."
            checked={theme.showReminderCta}
            onChange={(showReminderCta) => patch({ showReminderCta })}
          />
        </div>
      </PanelSection>
    </div>
  );
}
