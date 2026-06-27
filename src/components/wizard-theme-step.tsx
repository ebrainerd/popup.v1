"use client";

import { ShopThemeEditor } from "@/components/shop-theme-editor";
import type { ShopTheme } from "@/lib/shop-theme";
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
  return (
    <ShopThemeEditor
      theme={theme}
      shopName={shopName}
      coverUrl={coverUrl}
      products={products}
      onChange={onChange}
    />
  );
}
