export const SHOP_THEME_PRESETS = [
  "default",
  "gallery",
  "dark_room",
  "market_stall",
  "broadcast",
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
  description: string;
  defaultAccent: string;
  swatch: string;
};

export type ShopLayoutModeMeta = {
  id: ShopLayoutMode;
  label: string;
  description: string;
};

export const SHOP_THEME_PRESET_META: Record<ShopThemePreset, ShopThemePresetMeta> = {
  default: {
    id: "default",
    label: "PopUp Default",
    description: "Electric coral and teal — the signature PopUp drop energy.",
    defaultAccent: "#ff3b8b",
    swatch: "linear-gradient(135deg, #ff3b8b 0%, #00e6c8 100%)",
  },
  gallery: {
    id: "gallery",
    label: "Gallery",
    description: "Clean white space and refined typography for art and collectibles.",
    defaultAccent: "#c4a882",
    swatch: "linear-gradient(135deg, #f5f0ea 0%, #c4a882 100%)",
  },
  dark_room: {
    id: "dark_room",
    label: "Dark Room",
    description: "Near-black backdrop with high-contrast accents for night drops.",
    defaultAccent: "#7c5cff",
    swatch: "linear-gradient(135deg, #0a0a0f 0%, #7c5cff 100%)",
  },
  market_stall: {
    id: "market_stall",
    label: "Market Stall",
    description: "Warm earthy tones for vintage, handmade, and market finds.",
    defaultAccent: "#d97706",
    swatch: "linear-gradient(135deg, #fef3c7 0%, #d97706 100%)",
  },
  broadcast: {
    id: "broadcast",
    label: "Broadcast",
    description: "Stream-first styling with bold accents for live-heavy sellers.",
    defaultAccent: "#ef4444",
    swatch: "linear-gradient(135deg, #1a1a2e 0%, #ef4444 100%)",
  },
};

export const SHOP_LAYOUT_MODE_META: Record<ShopLayoutMode, ShopLayoutModeMeta> = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Cover hero, shop info, product grid with chat alongside.",
  },
  broadcast: {
    id: "broadcast",
    label: "Broadcast",
    description: "Live stream dominates; products in a compact rail below.",
  },
  countdown: {
    id: "countdown",
    label: "Countdown",
    description: "Waiting-room optimized with a big timer and minimal preview.",
  },
  catalog: {
    id: "catalog",
    label: "Catalog",
    description: "Products are the hero; stream is secondary when live.",
  },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

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

export function parseShopTheme(raw: unknown): ShopTheme {
  const defaults = defaultShopTheme();
  if (!raw || typeof raw !== "object") return defaults;

  const data = raw as Record<string, unknown>;
  const preset = isPreset(data.preset) ? data.preset : defaults.preset;
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
  const preset = SHOP_THEME_PRESET_META[theme.preset];
  return {
    "--shop-accent": theme.accent,
    "--shop-preset-accent": preset.defaultAccent,
    "--shop-radius":
      theme.preset === "gallery" ? "0.5rem" : theme.preset === "market_stall" ? "1rem" : "1.25rem",
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

export function accentForPreset(preset: ShopThemePreset, currentAccent?: string): string {
  if (currentAccent && HEX_COLOR.test(currentAccent)) return currentAccent;
  return SHOP_THEME_PRESET_META[preset].defaultAccent;
}
