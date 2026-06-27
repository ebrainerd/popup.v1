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
  label: string;
  tagline: string;
  description: string;
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
    tagline: "Calm & curated",
    description:
      "Bright, editorial layout with serif headings and generous whitespace. Ideal for art, prints, and collectible drops.",
    defaultAccent: "#b8956b",
    swatch: "linear-gradient(135deg, #faf8f5 0%, #e8dfd3 50%, #b8956b 100%)",
  },
  dark_room: {
    id: "dark_room",
    label: "Dark Room",
    tagline: "Late-night drop",
    description:
      "Near-black surfaces with a vivid accent and tight corners. Built for streetwear, music, and after-hours releases.",
    defaultAccent: "#7c5cff",
    swatch: "linear-gradient(135deg, #050508 0%, #1a1030 50%, #7c5cff 100%)",
  },
  market_stall: {
    id: "market_stall",
    label: "Market Stall",
    tagline: "Warm & handmade",
    description:
      "Cream paper tones, rounded cards, and earthy accents. Perfect for vintage finds, ceramics, and maker goods.",
    defaultAccent: "#c2410c",
    swatch: "linear-gradient(135deg, #fffbeb 0%, #fde68a 40%, #c2410c 100%)",
  },
};

export const SHOP_LAYOUT_MODE_META: Record<ShopLayoutMode, ShopLayoutModeMeta> = {
  classic: {
    id: "classic",
    label: "Classic",
    tagline: "Balanced storefront",
    description:
      "Banner at the top, shop details, then products with chat in a side panel. The default PopUp room layout.",
  },
  broadcast: {
    id: "broadcast",
    label: "Stream first",
    tagline: "Live-forward",
    description:
      "Your live video (or banner) fills the top. Products stack below and chat spans the full width — built for watch-and-buy.",
  },
  countdown: {
    id: "countdown",
    label: "Waiting room",
    tagline: "Hype the opener",
    description:
      "Oversized countdown on the hero, reminder button up front, and a lighter product preview until doors open.",
  },
  catalog: {
    id: "catalog",
    label: "Catalog",
    tagline: "Products first",
    description:
      "Your product grid leads the page. Live stream and chat sit underneath as supporting panels.",
  },
};

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
    pageBackground: "#faf8f5",
    cardBackground: "#ffffff",
    foreground: "#1c1917",
    mutedForeground: "#78716c",
    border: "#e7e5e4",
    fontFamily: "Georgia, 'Times New Roman', serif",
    headingTransform: "none",
    headingLetterSpacing: "-0.03em",
    radius: "0.35rem",
    heroTreatment: "frame",
  },
  dark_room: {
    pageBackground: "#050508",
    cardBackground: "#101018",
    foreground: "#ededf2",
    mutedForeground: "#8b8b9a",
    border: "#252532",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    headingTransform: "uppercase",
    headingLetterSpacing: "0.06em",
    radius: "0.5rem",
    heroTreatment: "flat",
  },
  market_stall: {
    pageBackground: "#fffbeb",
    cardBackground: "#fffdf7",
    foreground: "#451a03",
    mutedForeground: "#92400e",
    border: "#fcd34d",
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
    layout: isLayout(data.layout) ? data.layout : defaults.layout,
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
