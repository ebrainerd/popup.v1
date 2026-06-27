import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  defaultShopTheme,
  parseShopTheme,
  relativeLuminance,
  shopThemeRootClassName,
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
