export const SHOP_THEME_PRESETS = [
  "default",
  "gallery",
  "dark_room",
  "market_stall",
] as const;

export type ShopThemePreset = (typeof SHOP_THEME_PRESETS)[number];

export const SHOP_LAYOUT_MODES = [
  "classic",
  "broadcast",
  "countdown",
  "catalog",
] as const;

export type ShopLayoutMode = (typeof SHOP_LAYOUT_MODES)[number];

/**
 * Layouts a seller can actually pick. We offer just two, each with a clear,
 * distinct purpose — one for live selling, one for photo-led shops. The other
 * enum slugs are retained only for backward compatibility with shops saved
 * before the picker was narrowed; `parseShopTheme` folds them into "classic".
 */
export const SHOP_PICKABLE_LAYOUTS = ["classic", "catalog"] as const satisfies readonly ShopLayoutMode[];

export type ShopPickableLayout = (typeof SHOP_PICKABLE_LAYOUTS)[number];

/** Legacy layouts that no longer render on their own; folded into The Room. */
const RETIRED_LAYOUTS: Record<string, ShopLayoutMode> = {
  broadcast: "classic",
  countdown: "classic",
};

/** Resolve any stored layout to one of the two supported layouts. */
export function normalizeLayout(value: unknown): ShopLayoutMode {
  if (typeof value === "string" && value in RETIRED_LAYOUTS) {
    return RETIRED_LAYOUTS[value]!;
  }
  if (isLayout(value) && (SHOP_PICKABLE_LAYOUTS as readonly string[]).includes(value)) {
    return value;
  }
  return "classic";
}

export const SHOP_BACKGROUND_STYLES = ["solid", "gradient", "none"] as const;

export type ShopBackgroundStyle = (typeof SHOP_BACKGROUND_STYLES)[number];

export type ShopProductGridColumns = 2 | 3;

export type ShopTheme = {
  preset: ShopThemePreset;
  layout: ShopLayoutMode;
  accent: string;
  background: ShopBackgroundStyle;
  productGridColumns: ShopProductGridColumns;
  showChat: boolean;
  showSellerBio: boolean;
  showReminderCta: boolean;
};

export type ShopThemePresetMeta = {
  id: ShopThemePreset;
  label: string;
  tagline: string;
  description: string;
  defaultAccent: string;
  swatch: string;
};

export type ShopLayoutModeMeta = {
  id: ShopLayoutMode;
  /** Archetype-led display name (e.g. "Live Stage"). */
  label: string;
  tagline: string;
  description: string;
  /** Short "best for…" line shown on the archetype picker card. */
  bestFor: string;
  /** Suggested color preset offered (not forced) when this layout is picked. */
  recommendedPreset: ShopThemePreset;
};

export type ShopBackgroundMeta = {
  id: ShopBackgroundStyle;
  label: string;
  description: string;
};

export type ShopPresetVisual = {
  pageBackground: string;
  cardBackground: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  fontFamily: string;
  headingTransform: string;
  headingLetterSpacing: string;
  radius: string;
  heroTreatment: "gradient" | "flat" | "frame";
};

export const SHOP_THEME_PRESET_META: Record<ShopThemePreset, ShopThemePresetMeta> = {
  default: {
    id: "default",
    label: "Neon PopUp",
    tagline: "Electric & bold",
    description:
      "The signature PopUp look — dark canvas, neon accent glow, and punchy sans-serif type. Best for hype drops and live energy.",
    defaultAccent: "#ff3b8b",
    swatch: "linear-gradient(135deg, #0f0f14 0%, #ff3b8b 50%, #00e6c8 100%)",
  },
  gallery: {
    id: "gallery",
    label: "Gallery",
    tagline: "Clean & curated",
    description:
      "Crisp white surfaces, serif headings, and a cobalt accent. Ideal for art, prints, and collectible drops.",
    defaultAccent: "#2d4ff2",
    swatch: "linear-gradient(135deg, #ffffff 0%, #eef1fe 50%, #2d4ff2 100%)",
  },
  dark_room: {
    id: "dark_room",
    label: "After Dark",
    tagline: "Late-night drop",
    description:
      "Near-black surfaces with an electric teal accent and tight corners. Built for streetwear, music, and after-hours releases.",
    defaultAccent: "#00e6c8",
    swatch: "linear-gradient(135deg, #08080c 0%, #10202a 50%, #00e6c8 100%)",
  },
  market_stall: {
    id: "market_stall",
    label: "Market Stall",
    tagline: "Warm & handmade",
    description:
      "Soft peach warmth, rounded cards, and a terracotta accent. Perfect for vintage finds, ceramics, and maker goods.",
    defaultAccent: "#e4572e",
    swatch: "linear-gradient(135deg, #fff4ec 0%, #ffd9c4 45%, #e4572e 100%)",
  },
};

// Archetype-led layout metadata. Keep the enum slugs (classic/broadcast/
// countdown/catalog) for backward compatibility — only the display copy and
// recommended pairings are archetype-branded. See
// docs/SHOP_LAYOUT_ARCHETYPES.md §3.
export const SHOP_LAYOUT_MODE_META: Record<ShopLayoutMode, ShopLayoutModeMeta> = {
  broadcast: {
    id: "broadcast",
    label: "Live Stage",
    tagline: "Built for live selling",
    description:
      "Your live video (or cover) fills the top and stays the star. Products sit right below and chat runs full width — watch, bid, and buy in one tap.",
    bestFor: "Creators whose drop is a live event — streams, flash drops, and auctions.",
    recommendedPreset: "default",
  },
  catalog: {
    id: "catalog",
    label: "Lookbook",
    tagline: "Lead with your photos",
    description:
      "Your product grid leads the page with big imagery. Your live stream and chat sit together in a band just below — great when the photos do the selling.",
    bestFor: "Best if your product photos sell themselves and you stream now and then.",
    recommendedPreset: "gallery",
  },
  countdown: {
    id: "countdown",
    label: "Drop Clock",
    tagline: "Hype the opening",
    description:
      "An oversized countdown and a prominent reminder button own the pre-open hero, with a teaser of products until doors open.",
    bestFor: "Limited runs that sell out fast — the clock and reminders do the work.",
    recommendedPreset: "dark_room",
  },
  classic: {
    id: "classic",
    label: "The Room",
    tagline: "Live & chat up top",
    description:
      "Your stream sits beside a live chat sidebar at the very top, with your product grid right below — so watching, chatting, and buying all happen together.",
    bestFor: "Best if you go live and sell in the moment — chat stays next to your stream.",
    recommendedPreset: "market_stall",
  },
};

/**
 * Recommended theme bundle offered (with consent) when a seller picks a layout.
 * Mirrors the default toggles + preset pairings in docs/SHOP_LAYOUT_ARCHETYPES.md
 * §3 and §5. Applied via the "Apply recommended settings" prompt in the editor —
 * never silently, so existing shops keep their settings on layout change.
 */
export const SHOP_LAYOUT_DEFAULTS: Record<ShopLayoutMode, Partial<ShopTheme>> = {
  broadcast: {
    preset: "default",
    accent: SHOP_THEME_PRESET_META.default.defaultAccent,
    showChat: true,
    showSellerBio: false,
    showReminderCta: false,
    productGridColumns: 2,
  },
  catalog: {
    preset: "gallery",
    accent: SHOP_THEME_PRESET_META.gallery.defaultAccent,
    showChat: true,
    showSellerBio: true,
    showReminderCta: true,
    productGridColumns: 3,
  },
  countdown: {
    preset: "dark_room",
    accent: SHOP_THEME_PRESET_META.dark_room.defaultAccent,
    showChat: false,
    showSellerBio: false,
    showReminderCta: true,
    productGridColumns: 2,
  },
  classic: {
    preset: "market_stall",
    accent: SHOP_THEME_PRESET_META.market_stall.defaultAccent,
    showChat: true,
    showSellerBio: true,
    showReminderCta: true,
    productGridColumns: 2,
  },
};

/** Recommended theme bundle for a layout, merged onto an existing theme. */
export function recommendedThemeForLayout(layout: ShopLayoutMode, base: ShopTheme): ShopTheme {
  return { ...base, ...SHOP_LAYOUT_DEFAULTS[layout], layout };
}

export const SHOP_BACKGROUND_META: Record<ShopBackgroundStyle, ShopBackgroundMeta> = {
  gradient: {
    id: "gradient",
    label: "Accent glow",
    description: "A soft radial wash of your accent color behind the shop.",
  },
  solid: {
    id: "solid",
    label: "Tinted",
    description: "A subtle flat tint of your accent across the page background.",
  },
  none: {
    id: "none",
    label: "Plain",
    description: "No extra page coloring — just your theme surfaces and cards.",
  },
};

export const SHOP_PRESET_VISUAL: Record<ShopThemePreset, ShopPresetVisual> = {
  default: {
    pageBackground: "#0f0f14",
    cardBackground: "#1a1a22",
    foreground: "#f5f5f7",
    mutedForeground: "#a1a1aa",
    border: "#2a2a36",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    headingTransform: "none",
    headingLetterSpacing: "-0.02em",
    radius: "1rem",
    heroTreatment: "gradient",
  },
  gallery: {
    pageBackground: "#f7f7f5",
    cardBackground: "#ffffff",
    foreground: "#16161a",
    mutedForeground: "#63636e",
    border: "#e7e7ea",
    fontFamily: "Georgia, 'Times New Roman', serif",
    headingTransform: "none",
    headingLetterSpacing: "-0.03em",
    radius: "0.5rem",
    heroTreatment: "frame",
  },
  dark_room: {
    pageBackground: "#08080c",
    cardBackground: "#12121a",
    foreground: "#f0f0f5",
    mutedForeground: "#9a9aac",
    border: "#26263a",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    headingTransform: "uppercase",
    headingLetterSpacing: "0.06em",
    radius: "0.5rem",
    heroTreatment: "flat",
  },
  market_stall: {
    pageBackground: "#fff4ec",
    cardBackground: "#ffffff",
    foreground: "#2f1c15",
    mutedForeground: "#8a6a5c",
    border: "#f0ddd0",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    headingTransform: "none",
    headingLetterSpacing: "0",
    radius: "1.25rem",
    heroTreatment: "frame",
  },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const LEGACY_PRESETS: Record<string, ShopThemePreset> = {
  broadcast: "default",
};

export function defaultShopTheme(): ShopTheme {
  return {
    preset: "default",
    layout: "classic",
    accent: SHOP_THEME_PRESET_META.default.defaultAccent,
    background: "gradient",
    productGridColumns: 2,
    showChat: true,
    showSellerBio: true,
    showReminderCta: true,
  };
}

function isPreset(value: unknown): value is ShopThemePreset {
  return typeof value === "string" && SHOP_THEME_PRESETS.includes(value as ShopThemePreset);
}

function isLayout(value: unknown): value is ShopLayoutMode {
  return typeof value === "string" && SHOP_LAYOUT_MODES.includes(value as ShopLayoutMode);
}

function isBackground(value: unknown): value is ShopBackgroundStyle {
  return typeof value === "string" && SHOP_BACKGROUND_STYLES.includes(value as ShopBackgroundStyle);
}

function normalizePreset(value: unknown): ShopThemePreset {
  if (typeof value === "string" && value in LEGACY_PRESETS) {
    return LEGACY_PRESETS[value]!;
  }
  if (isPreset(value)) return value;
  return defaultShopTheme().preset;
}

export function parseShopTheme(raw: unknown): ShopTheme {
  const defaults = defaultShopTheme();
  if (!raw || typeof raw !== "object") return defaults;

  const data = raw as Record<string, unknown>;
  const preset = normalizePreset(data.preset);
  const presetMeta = SHOP_THEME_PRESET_META[preset];

  const accent =
    typeof data.accent === "string" && HEX_COLOR.test(data.accent)
      ? data.accent
      : presetMeta.defaultAccent;

  return {
    preset,
    layout: normalizeLayout(data.layout),
    accent,
    background: isBackground(data.background) ? data.background : defaults.background,
    productGridColumns: data.productGridColumns === 3 ? 3 : 2,
    showChat: data.showChat !== false,
    showSellerBio: data.showSellerBio !== false,
    showReminderCta: data.showReminderCta !== false,
  };
}

export function shopThemeToJson(theme: ShopTheme): ShopTheme {
  return parseShopTheme(theme);
}

export function shopThemeCssVars(theme: ShopTheme): Record<string, string> {
  const visual = SHOP_PRESET_VISUAL[theme.preset];
  return {
    "--shop-accent": theme.accent,
    "--shop-page-bg": visual.pageBackground,
    "--shop-card-bg": visual.cardBackground,
    "--shop-fg": visual.foreground,
    "--shop-muted": visual.mutedForeground,
    "--shop-border": visual.border,
    "--shop-font": visual.fontFamily,
    "--shop-radius": visual.radius,
    "--shop-heading-transform": visual.headingTransform,
    "--shop-heading-spacing": visual.headingLetterSpacing,
  };
}

export function shopThemeRootClassName(theme: ShopTheme): string {
  return [
    "shop-theme-root",
    `shop-theme-${theme.preset}`,
    `shop-layout-${theme.layout}`,
    `shop-bg-${theme.background}`,
    `shop-grid-cols-${theme.productGridColumns}`,
  ].join(" ");
}

export function presetAccent(preset: ShopThemePreset): string {
  return SHOP_THEME_PRESET_META[preset].defaultAccent;
}

/** @deprecated use presetAccent */
export function accentForPreset(preset: ShopThemePreset): string {
  return presetAccent(preset);
}

export function previewPageBackground(theme: ShopTheme): string {
  const visual = SHOP_PRESET_VISUAL[theme.preset];
  if (theme.background === "none") return visual.pageBackground;
  if (theme.background === "solid") {
    return `color-mix(in srgb, ${theme.accent} 10%, ${visual.pageBackground})`;
  }
  return `radial-gradient(ellipse 90% 55% at 50% -5%, color-mix(in srgb, ${theme.accent} 28%, transparent), ${visual.pageBackground})`;
}

/** Mix two hex colors (0–1 weight on color b). Used for contrast checks. */
export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.min(1, Math.max(0, weightB));
  const mix = (i: 0 | 1 | 2) => Math.round(a[i] * (1 - w) + b[i] * w);
  return rgbToHex(mix(0), mix(1), mix(2));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance for #rrggbb. */
export function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Effective flat page color for contrast validation (conservative). */
export function effectiveThemePageColor(theme: ShopTheme): string {
  const visual = SHOP_PRESET_VISUAL[theme.preset];
  if (theme.background === "none") return visual.pageBackground;
  if (theme.background === "solid") {
    return mixHexColors(visual.pageBackground, theme.accent, 0.1);
  }
  // Gradient wash — assume up to ~28% accent influence at the hero.
  return mixHexColors(visual.pageBackground, theme.accent, 0.28);
}

export type ShopThemeContrastWarning = {
  id: string;
  message: string;
};

/** Returns readability warnings for theme editor (WCAG AA body text ≈ 4.5:1). */
export function validateShopThemeContrast(theme: ShopTheme): ShopThemeContrastWarning[] {
  const visual = SHOP_PRESET_VISUAL[theme.preset];
  const pageColor = effectiveThemePageColor(theme);
  const warnings: ShopThemeContrastWarning[] = [];

  const bodyRatio = contrastRatio(visual.foreground, pageColor);
  if (bodyRatio < 4.5) {
    warnings.push({
      id: "body-contrast",
      message: `Body text contrast is ${bodyRatio.toFixed(1)}:1 on this background (need 4.5:1). Try a different preset or a less intense accent background.`,
    });
  }

  const mutedRatio = contrastRatio(visual.mutedForeground, pageColor);
  if (mutedRatio < 3) {
    warnings.push({
      id: "muted-contrast",
      message: `Secondary text may be hard to read (${mutedRatio.toFixed(1)}:1). Consider Plain background or a softer accent.`,
    });
  }

  const accentOnPage = contrastRatio(theme.accent, pageColor);
  if (accentOnPage < 3) {
    warnings.push({
      id: "accent-contrast",
      message: `Accent color may not stand out on this background (${accentOnPage.toFixed(1)}:1).`,
    });
  }

  return warnings;
}
