"use client";

import Image from "next/image";
import { MessageCircle, Package, User } from "lucide-react";
import {
  SHOP_LAYOUT_MODE_META,
  SHOP_THEME_PRESET_META,
  shopThemeRootClassName,
  shopThemeCssVars,
  type ShopTheme,
} from "@/lib/shop-theme";
import { cn, formatCurrency } from "@/lib/utils";

type PreviewProduct = {
  title: string;
  price: string;
  photoUrl?: string;
};

export function ShopThemePreview({
  theme,
  shopName,
  coverUrl,
  products,
  mobile = false,
}: {
  theme: ShopTheme;
  shopName: string;
  coverUrl?: string;
  products: PreviewProduct[];
  mobile?: boolean;
}) {
  const preset = SHOP_THEME_PRESET_META[theme.preset];
  const layout = SHOP_LAYOUT_MODE_META[theme.layout];
  const previewProducts = products.filter((p) => p.title.trim()).slice(0, theme.productGridColumns);
  const style = shopThemeCssVars(theme) as React.CSSProperties;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border shadow-sm",
        mobile ? "mx-auto w-[220px]" : "w-full",
        shopThemeRootClassName(theme),
      )}
      style={style}
    >
      <div className="border-b border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Preview · {preset.label} · {layout.label}
      </div>

      <div className="space-y-2 p-3">
        {theme.layout !== "catalog" && (
          <div
            className={cn(
              "relative overflow-hidden rounded-lg bg-muted",
              theme.layout === "broadcast" ? "aspect-video" : "aspect-[16/7]",
              theme.layout === "countdown" && "ring-2 ring-[var(--shop-accent)]/40",
            )}
          >
            {coverUrl ? (
              <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[var(--shop-accent)]/25 to-muted" />
            )}
            {theme.layout === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-center text-[10px] font-semibold text-white">
                Opens in 2h 14m
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="truncate text-sm font-bold">{shopName.trim() || "Your shop name"}</p>
          {theme.showSellerBio && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="size-2.5" /> @seller
            </p>
          )}
        </div>

        <div
          className={cn(
            "grid gap-1.5",
            theme.productGridColumns === 3 ? "grid-cols-3" : "grid-cols-2",
            theme.layout === "catalog" && "order-first",
          )}
        >
          {(previewProducts.length > 0
            ? previewProducts
            : [{ title: "Product", price: "12.00" }]
          ).map((product, i) => (
            <div
              key={`${product.title}-${i}`}
              className="overflow-hidden rounded-md border border-border/70 bg-card/80"
            >
              <div className="aspect-square bg-muted">
                {product.photoUrl ? (
                  <Image
                    src={product.photoUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="size-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="space-y-0.5 p-1.5">
                <p className="truncate text-[9px] font-medium">{product.title}</p>
                <p className="text-[9px] font-semibold text-[var(--shop-accent)]">
                  {formatCurrency(Math.round(parseFloat(product.price || "0") * 100))}
                </p>
              </div>
            </div>
          ))}
        </div>

        {theme.showChat && theme.layout !== "countdown" && (
          <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/80 bg-muted/20 px-2 py-1.5 text-[9px] text-muted-foreground">
            <MessageCircle className="size-3" /> Chat room
          </div>
        )}

        {theme.showReminderCta && theme.layout === "countdown" && (
          <div className="rounded-md bg-[var(--shop-accent)]/15 px-2 py-1.5 text-center text-[9px] font-medium text-[var(--shop-accent)]">
            Remind me when it opens
          </div>
        )}
      </div>
    </div>
  );
}
