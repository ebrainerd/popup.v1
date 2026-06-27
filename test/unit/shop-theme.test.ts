import { describe, expect, it } from "vitest";
import {
  defaultShopTheme,
  parseShopTheme,
  shopThemeRootClassName,
  SHOP_THEME_PRESET_META,
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
});
