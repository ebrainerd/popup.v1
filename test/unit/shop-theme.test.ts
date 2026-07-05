import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  defaultShopTheme,
  normalizeLayout,
  parseShopTheme,
  recommendedThemeForLayout,
  relativeLuminance,
  shopThemeRootClassName,
  SHOP_LAYOUT_DEFAULTS,
  SHOP_LAYOUT_MODE_META,
  SHOP_LAYOUT_MODES,
  SHOP_PICKABLE_LAYOUTS,
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

  it("folds retired layouts into a supported one on parse", () => {
    expect(parseShopTheme({ layout: "broadcast" }).layout).toBe("classic");
    expect(parseShopTheme({ layout: "countdown" }).layout).toBe("classic");
    expect(parseShopTheme({ layout: "catalog" }).layout).toBe("catalog");
    expect(parseShopTheme({ layout: "classic" }).layout).toBe("classic");
    expect(parseShopTheme({ layout: "nonsense" }).layout).toBe("classic");
  });

  it("only offers The Room and Lookbook as pickable layouts", () => {
    expect([...SHOP_PICKABLE_LAYOUTS]).toEqual(["classic", "catalog"]);
    expect(normalizeLayout("broadcast")).toBe("classic");
    expect(normalizeLayout("catalog")).toBe("catalog");
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

describe("shop layout archetypes", () => {
  it("uses archetype display labels for every layout slug", () => {
    expect(SHOP_LAYOUT_MODE_META.broadcast.label).toBe("Live Stage");
    expect(SHOP_LAYOUT_MODE_META.catalog.label).toBe("Lookbook");
    expect(SHOP_LAYOUT_MODE_META.countdown.label).toBe("Drop Clock");
    expect(SHOP_LAYOUT_MODE_META.classic.label).toBe("The Room");
  });

  it("provides bestFor copy and a recommended preset per layout", () => {
    for (const id of SHOP_LAYOUT_MODES) {
      const meta = SHOP_LAYOUT_MODE_META[id];
      expect(meta.bestFor.length).toBeGreaterThan(0);
      expect(SHOP_THEME_PRESET_META[meta.recommendedPreset]).toBeTruthy();
    }
  });

  it("keeps the original enum slugs for backward compatibility", () => {
    expect([...SHOP_LAYOUT_MODES].sort()).toEqual(
      ["broadcast", "catalog", "classic", "countdown"].sort(),
    );
  });

  it("returns the expected default toggles per layout", () => {
    expect(SHOP_LAYOUT_DEFAULTS.broadcast).toMatchObject({
      preset: "default",
      showChat: true,
      showSellerBio: false,
      showReminderCta: false,
      productGridColumns: 2,
    });
    expect(SHOP_LAYOUT_DEFAULTS.catalog).toMatchObject({
      preset: "gallery",
      showChat: true,
      showSellerBio: true,
      showReminderCta: true,
      productGridColumns: 3,
    });
    expect(SHOP_LAYOUT_DEFAULTS.countdown).toMatchObject({
      preset: "dark_room",
      showChat: false,
      showSellerBio: false,
      showReminderCta: true,
      productGridColumns: 2,
    });
    expect(SHOP_LAYOUT_DEFAULTS.classic).toMatchObject({
      preset: "market_stall",
      showChat: true,
      showSellerBio: true,
      showReminderCta: true,
      productGridColumns: 2,
    });
  });

  it("aligns recommended preset metadata with the default bundle", () => {
    for (const id of SHOP_LAYOUT_MODES) {
      expect(SHOP_LAYOUT_DEFAULTS[id].preset).toBe(SHOP_LAYOUT_MODE_META[id].recommendedPreset);
      expect(SHOP_LAYOUT_DEFAULTS[id].accent).toBe(
        SHOP_THEME_PRESET_META[SHOP_LAYOUT_MODE_META[id].recommendedPreset].defaultAccent,
      );
    }
  });

  it("merges recommended settings onto a theme while forcing the layout", () => {
    const base = defaultShopTheme();
    const result = recommendedThemeForLayout("countdown", base);
    expect(result.layout).toBe("countdown");
    expect(result.preset).toBe("dark_room");
    expect(result.showChat).toBe(false);
    expect(result.showReminderCta).toBe(true);
    expect(result.accent).toBe(SHOP_THEME_PRESET_META.dark_room.defaultAccent);
  });
});
