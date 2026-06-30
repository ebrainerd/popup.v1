import { describe, expect, it } from "vitest";
import {
  applyLayoutDefaults,
  contrastRatio,
  defaultShopTheme,
  parseShopTheme,
  relativeLuminance,
  shopThemeRootClassName,
  SHOP_LAYOUT_DEFAULTS,
  SHOP_LAYOUT_MODE_META,
  SHOP_LAYOUT_MODES,
  SHOP_PRESET_VISUAL,
  SHOP_THEME_PRESET_META,
  validateShopThemeContrast,
} from "@/lib/shop-theme";

describe("shop theme", () => {
  it("returns defaults for empty input", () => {
    expect(parseShopTheme(null)).toEqual(defaultShopTheme());
    expect(parseShopTheme({})).toEqual(defaultShopTheme());
  });

  it("parses a valid theme payload", () => {
    const theme = parseShopTheme({
      preset: "gallery",
      layout: "catalog",
      accent: "#aabbcc",
      background: "solid",
      productGridColumns: 3,
      showChat: false,
      showSellerBio: true,
      showReminderCta: false,
    });

    expect(theme.preset).toBe("gallery");
    expect(theme.layout).toBe("catalog");
    expect(theme.accent).toBe("#aabbcc");
    expect(theme.background).toBe("solid");
    expect(theme.productGridColumns).toBe(3);
    expect(theme.showChat).toBe(false);
    expect(theme.showReminderCta).toBe(false);
  });

  it("falls back to preset accent for invalid colors", () => {
    const theme = parseShopTheme({ preset: "dark_room", accent: "not-a-color" });
    expect(theme.accent).toBe(SHOP_THEME_PRESET_META.dark_room.defaultAccent);
  });

  it("migrates legacy broadcast preset to default", () => {
    const theme = parseShopTheme({ preset: "broadcast", layout: "classic" });
    expect(theme.preset).toBe("default");
  });

  it("builds root class names for preset, layout, and grid", () => {
    const classes = shopThemeRootClassName({
      ...defaultShopTheme(),
      preset: "market_stall",
      layout: "broadcast",
      productGridColumns: 3,
      background: "none",
    });

    expect(classes).toContain("shop-theme-market_stall");
    expect(classes).toContain("shop-layout-broadcast");
    expect(classes).toContain("shop-grid-cols-3");
    expect(classes).toContain("shop-bg-none");
  });

  it("computes contrast ratio for readable pairs", () => {
    const dark = SHOP_PRESET_VISUAL.default.foreground;
    const light = SHOP_PRESET_VISUAL.gallery.foreground;
    expect(contrastRatio(dark, SHOP_PRESET_VISUAL.default.pageBackground)).toBeGreaterThan(4.5);
    expect(contrastRatio(light, SHOP_PRESET_VISUAL.gallery.pageBackground)).toBeGreaterThan(4.5);
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#000000"));
  });

  it("detects unreadable light-on-light text pairs", () => {
    expect(contrastRatio("#f5f5f7", "#fffbeb")).toBeLessThan(4.5);
  });

  it("passes contrast for market stall preset with plain background", () => {
    const theme = {
      ...defaultShopTheme(),
      preset: "market_stall" as const,
      accent: SHOP_THEME_PRESET_META.market_stall.defaultAccent,
      background: "none" as const,
    };
    const warnings = validateShopThemeContrast(theme);
    expect(warnings).toHaveLength(0);
  });
});

describe("shop layout archetype metadata", () => {
  it("rebrands every layout to its archetype label + tagline", () => {
    expect(SHOP_LAYOUT_MODE_META.classic.label).toBe("The Room");
    expect(SHOP_LAYOUT_MODE_META.broadcast.label).toBe("Live Stage");
    expect(SHOP_LAYOUT_MODE_META.countdown.label).toBe("Drop Clock");
    expect(SHOP_LAYOUT_MODE_META.catalog.label).toBe("Lookbook");

    expect(SHOP_LAYOUT_MODE_META.broadcast.tagline).toBe("Built for live selling");
    expect(SHOP_LAYOUT_MODE_META.catalog.tagline).toBe("Let your work lead");
  });

  it("keeps an entry with matching id and non-empty copy for each layout slug", () => {
    for (const slug of SHOP_LAYOUT_MODES) {
      const meta = SHOP_LAYOUT_MODE_META[slug];
      expect(meta.id).toBe(slug);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.tagline.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});

describe("shop layout defaults", () => {
  it("defines recommended toggles + grid per layout (spec §5)", () => {
    expect(SHOP_LAYOUT_DEFAULTS.broadcast).toMatchObject({
      preset: "default",
      productGridColumns: 2,
      showChat: true,
      showSellerBio: false,
      showReminderCta: false,
    });
    expect(SHOP_LAYOUT_DEFAULTS.catalog).toMatchObject({
      preset: "gallery",
      productGridColumns: 3,
      showChat: true,
      showSellerBio: true,
      showReminderCta: true,
    });
    expect(SHOP_LAYOUT_DEFAULTS.countdown).toMatchObject({
      preset: "dark_room",
      productGridColumns: 2,
      showChat: false,
      showSellerBio: false,
      showReminderCta: true,
    });
    expect(SHOP_LAYOUT_DEFAULTS.classic).toMatchObject({
      preset: "market_stall",
      productGridColumns: 2,
      showChat: true,
      showSellerBio: true,
      showReminderCta: true,
    });
  });

  it("pairs each layout default with its preset's accent", () => {
    for (const slug of SHOP_LAYOUT_MODES) {
      const defaults = SHOP_LAYOUT_DEFAULTS[slug];
      expect(defaults.accent).toBe(SHOP_THEME_PRESET_META[defaults.preset!].defaultAccent);
    }
  });

  it("applyLayoutDefaults switches layout and applies recommended settings", () => {
    const start = defaultShopTheme();
    const next = applyLayoutDefaults(start, "countdown");

    expect(next.layout).toBe("countdown");
    expect(next.preset).toBe("dark_room");
    expect(next.accent).toBe(SHOP_THEME_PRESET_META.dark_room.defaultAccent);
    expect(next.showChat).toBe(false);
    expect(next.showReminderCta).toBe(true);
    expect(next.productGridColumns).toBe(2);
  });

  it("applyLayoutDefaults returns a parsed, valid theme without mutating input", () => {
    const start = defaultShopTheme();
    const next = applyLayoutDefaults(start, "catalog");

    expect(next).toEqual(parseShopTheme(next));
    expect(next).not.toBe(start);
    expect(start).toEqual(defaultShopTheme());
  });
});
