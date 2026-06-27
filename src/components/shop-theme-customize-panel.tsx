"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateShopTheme } from "@/app/dashboard/actions";
import { ShopThemeEditor } from "@/components/shop-theme-editor";
import { parseShopTheme, type ShopTheme } from "@/lib/shop-theme";
import type { Product, Shop } from "@/lib/database.types";

export function ShopThemeCustomizePanel({
  shop,
  products,
}: {
  shop: Shop;
  products: Product[];
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ShopTheme>(() => parseShopTheme(shop.shop_theme));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const previewProducts = products.map((p) => ({
    title: p.title,
    price: (p.price / 100).toFixed(2),
    photoUrl: p.photo_urls?.[0] ?? p.photo_url ?? undefined,
  }));

  async function handleSave() {
    setError(null);
    const res = await updateShopTheme(shop.id, theme);
    if (res.error) {
      setError(res.error);
      throw new Error(res.error);
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      {error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{error}</p>
      )}
      <ShopThemeEditor
      theme={theme}
      shopName={shop.name}
      coverUrl={shop.cover_url ?? ""}
      products={previewProducts}
      onChange={setTheme}
      onSave={handleSave}
      showSave
      saveLabel="Save appearance"
    />
    </>
  );
}
