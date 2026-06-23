"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Package, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useShopEvent } from "@/components/shop-room";
import { BuyButton } from "@/components/buy-button";
import { Badge } from "@/components/ui/badge";
import { celebrate } from "@/lib/confetti";
import {
  ROOM_EVENTS,
  type FlashPriceBroadcast,
  type FlashClearBroadcast,
  type FlashItemBroadcast,
} from "@/lib/realtime";
import type { Product } from "@/lib/database.types";
import { cn, formatCurrency } from "@/lib/utils";

function photosOf(product: Product): string[] {
  if (product.photo_urls && product.photo_urls.length > 0) return product.photo_urls;
  return product.photo_url ? [product.photo_url] : [];
}

export function ProductsGridLive({
  shopId,
  initialProducts,
  isOpen,
  isAuthed,
}: {
  shopId: string;
  initialProducts: Product[];
  isOpen: boolean;
  isAuthed: boolean;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [openId, setOpenId] = useState<string | null>(null);

  useShopEvent(ROOM_EVENTS.flashPrice, (payload) => {
    const { productId, discountPrice } = payload as FlashPriceBroadcast;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, discount_price: discountPrice } : p)),
    );
    celebrate();
  });

  useShopEvent(ROOM_EVENTS.flashClear, (payload) => {
    const { productId } = payload as FlashClearBroadcast;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, discount_price: null } : p)),
    );
  });

  useShopEvent(ROOM_EVENTS.flashItem, (payload) => {
    const item = payload as FlashItemBroadcast;
    setProducts((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item as Product]));
    celebrate();
  });

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        No products listed yet.
      </p>
    );
  }

  const openProduct = products.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            shopId={shopId}
            isOpen={isOpen}
            isAuthed={isAuthed}
            onOpenDetails={() => setOpenId(product.id)}
          />
        ))}
      </div>

      {openProduct && (
        <ProductDetailDialog
          product={openProduct}
          shopId={shopId}
          isOpen={isOpen}
          isAuthed={isAuthed}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function ProductCard({
  product,
  shopId,
  isOpen,
  isAuthed,
  onOpenDetails,
}: {
  product: Product;
  shopId: string;
  isOpen: boolean;
  isAuthed: boolean;
  onOpenDetails: () => void;
}) {
  const photos = photosOf(product);
  const discounted = product.discount_price != null && product.discount_price < product.price;
  const soldOut = product.quantity <= 0;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow",
        discounted ? "border-primary/60 glow-primary" : "border-border",
      )}
    >
      <Gallery
        photos={photos}
        alt={product.title}
        onImageClick={onOpenDetails}
        overlay={
          <>
            {product.is_flash_only && (
              <Badge variant="accent" className="absolute left-2 top-2">
                Flash item
              </Badge>
            )}
            {discounted && (
              <Badge variant="live" className="absolute right-2 top-2 animate-live-pulse">
                ⚡ Flash Drop
              </Badge>
            )}
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Badge variant="muted">Sold out</Badge>
              </div>
            )}
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <button onClick={onOpenDetails} className="text-left font-semibold hover:underline">
          {product.title}
        </button>
        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <PriceBlock product={product} />
          <BuyButton
            shopId={shopId}
            productId={product.id}
            isOpen={isOpen}
            soldOut={soldOut}
            isAuthed={isAuthed}
          />
        </div>
      </div>
    </div>
  );
}

function ProductDetailDialog({
  product,
  shopId,
  isOpen,
  isAuthed,
  onClose,
}: {
  product: Product;
  shopId: string;
  isOpen: boolean;
  isAuthed: boolean;
  onClose: () => void;
}) {
  const photos = photosOf(product);
  const soldOut = product.quantity <= 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Gallery photos={photos} alt={product.title} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <h2 className="text-xl font-bold">{product.title}</h2>
          {product.description && (
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{product.description}</p>
          )}
          <div className="flex items-end justify-between border-t border-border pt-3">
            <PriceBlock product={product} />
            <BuyButton
              shopId={shopId}
              productId={product.id}
              isOpen={isOpen}
              soldOut={soldOut}
              isAuthed={isAuthed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceBlock({ product }: { product: Product }) {
  const discounted = product.discount_price != null && product.discount_price < product.price;
  const soldOut = product.quantity <= 0;
  return (
    <div>
      {discounted ? (
        <div className="flex items-baseline gap-2">
          <span key={product.discount_price} className="animate-price-pop text-lg font-bold text-live">
            {formatCurrency(product.discount_price!)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(product.price)}
          </span>
        </div>
      ) : (
        <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
      )}
      <p className="text-xs text-muted-foreground">{soldOut ? "Out of stock" : `${product.quantity} left`}</p>
    </div>
  );
}

/** Square image gallery with prev/next + dots when there are multiple photos. */
function Gallery({
  photos,
  alt,
  onImageClick,
  overlay,
}: {
  photos: string[];
  alt: string;
  onImageClick?: () => void;
  overlay?: React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const has = photos.length > 0;
  const idx = Math.min(i, Math.max(0, photos.length - 1));

  return (
    <div className="relative aspect-square w-full bg-muted">
      {has ? (
        <Image
          src={photos[idx]}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={cn("object-cover", onImageClick && "cursor-zoom-in")}
          onClick={onImageClick}
        />
      ) : (
        <button
          type="button"
          onClick={onImageClick}
          className="flex h-full w-full items-center justify-center text-muted-foreground"
        >
          <Package className="size-8" />
        </button>
      )}

      {overlay}

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              setI((idx - 1 + photos.length) % photos.length);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              setI((idx + 1) % photos.length);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.map((_, n) => (
              <span
                key={n}
                className={cn("h-1.5 w-1.5 rounded-full", n === idx ? "bg-white" : "bg-white/40")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
