"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { updateShopTheme } from "@/app/dashboard/actions";
import { parseShopTheme, type ShopTheme } from "@/lib/shop-theme";
import type { Product, Shop } from "@/lib/database.types";
import type { ShopPreviewPhase } from "@/components/shop-theme-preview";
import { Button } from "@/components/ui/button";
import { StudioCanvas, type StudioViewport } from "@/components/studio/studio-canvas";
import { StudioStylePanel } from "@/components/studio/style-panel";

/**
 * Customize studio for existing shops: same canvas-and-panel layout as the
 * Shop Studio, scoped to theme/layout controls with an explicit save.
 */
export function ShopCustomizeStudio({
  shop,
  products,
}: {
  shop: Shop;
  products: Product[];
}) {
  const router = useRouter();
  const initialTheme = useMemo<ShopTheme>(
    () => parseShopTheme(shop.shop_theme),
    [shop.shop_theme],
  );
  const [theme, setTheme] = useState<ShopTheme>(initialTheme);
  const [savedTheme, setSavedTheme] = useState<ShopTheme>(initialTheme);
  const [phase, setPhase] = useState<ShopPreviewPhase>("open");
  const [viewport, setViewport] = useState<StudioViewport>("desktop");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  const previewProducts = products.map((p) => ({
    title: p.title,
    price: (p.price / 100).toFixed(2),
    photoUrl: p.photo_urls?.[0] ?? p.photo_url ?? undefined,
  }));

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateShopTheme(shop.id, theme);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSavedTheme(theme);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      router.refresh();
    });
  }

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2">
      <div className="flex flex-col lg:h-[calc(100dvh-4rem)]">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/dashboard/shops/${shop.id}`}
              aria-label="Back to manage shop"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{shop.name}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">Customize appearance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {justSaved && !dirty ? (
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                <Check className="size-3.5 text-success" /> Saved
              </span>
            ) : dirty ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Unsaved changes
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              onClick={handleSave}
              disabled={pending || !dirty}
            >
              {pending ? "Saving…" : "Save appearance"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="border-b border-live/20 bg-live/10 px-4 py-2 text-sm text-live">{error}</p>
        )}

        {/* Canvas + panel */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <StudioCanvas
            theme={theme}
            shopName={shop.name}
            coverUrl={shop.cover_url ?? ""}
            products={previewProducts}
            phase={phase}
            onPhaseChange={setPhase}
            viewport={viewport}
            onViewportChange={setViewport}
            className="h-[46vh] border-b border-border/60 lg:h-auto lg:border-b-0"
          />

          <aside className="flex min-h-0 flex-col border-border/60 bg-card/30 lg:w-[400px] lg:shrink-0 lg:border-l">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
              <StudioStylePanel theme={theme} onChange={setTheme} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
