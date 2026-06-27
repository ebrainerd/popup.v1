import type { CSSProperties, ReactNode } from "react";
import {
  parseShopTheme,
  shopThemeCssVars,
  shopThemeRootClassName,
  type ShopTheme,
} from "@/lib/shop-theme";
import { cn } from "@/lib/utils";

export function ShopThemeShell({
  theme: rawTheme,
  children,
}: {
  theme: unknown;
  children: ReactNode;
}) {
  const theme = parseShopTheme(rawTheme);
  const style = shopThemeCssVars(theme) as CSSProperties;

  return (
    <div
      className={cn(shopThemeRootClassName(theme), "min-h-full")}
      style={style}
      data-shop-theme={theme.preset}
      data-shop-layout={theme.layout}
    >
      {children}
    </div>
  );
}

export type { ShopTheme };
