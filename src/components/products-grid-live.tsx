"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Package, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useShopEvent } from "@/components/shop-room";
import { AuctionProductActions } from "@/components/auction-product-actions";
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
import type { AuctionRunWithProduct, AuctionProductState } from "@/lib/auctions";
import { cn, formatCurrency } from "@/lib/utils";
import { isFlashDiscounted, productDisplayPrice } from "@/lib/product-pricing";
import { useShopOpen } from "@/hooks/use-shop-open";

function photosOf(product: Product): string[] {
  if (product.photo_urls && product.photo_urls.length > 0) return product.photo_urls;
  return product.photo_url ? [product.photo_url] : [];
}

type AuctionActionState = {
  run: AuctionRunWithProduct;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
};

export function ProductsGridLive({
  shopId,
  initialProducts,
  isOpen,
  isAuthed,
  isOwner,
  userId,
  initialAuctionsByProductId,
  startAt,
  endAt,
  gridColumns = 2,
}: {
  shopId: string;
  initialProducts: Product[];
  isOpen: boolean;
  isAuthed: boolean;
  isOwner: boolean;
  userId: string | null;
  initialAuctionsByProductId: Record<string, AuctionProductState>;
  startAt: string;
  endAt: string;
  gridColumns?: 2 | 3;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [openId, setOpenId] = useState<string | null>(null);
  const shopOpen = useShopOpen(startAt, endAt, isOpen);

  useShopEvent(ROOM_EVENTS.flashPrice, (payload) => {
    const { productId, discountPrice, auctionStartingBid } = payload as FlashPriceBroadcast;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          discount_price: discountPrice,
          auction_starting_bid:
            auctionStartingBid ?? (p.sale_type === "auction" ? discountPrice : p.auction_starting_bid),
        };
      }),
    );
    celebrate();
  });

  useShopEvent(ROOM_EVENTS.flashClear, (payload) => {
    const { productId, restoreAuctionStartingBid } = payload as FlashClearBroadcast;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          discount_price: null,
          auction_starting_bid:
            p.sale_type === "auction"
              ? (restoreAuctionStartingBid ?? p.price)
              : p.auction_starting_bid,
        };
      }),
    );
  });

  useShopEvent(ROOM_EVENTS.flashItem, (payload) => {
    const item = payload as FlashItemBroadcast;
    setProducts((prev) =>
      prev.some((p) => p.id === item.id)
        ? prev
        : [
            ...prev,
            {
              ...item,
              photo_urls: item.photo_urls ?? (item.photo_url ? [item.photo_url] : []),
              shipping_rate: item.shipping_rate ?? 0,
              created_at: item.created_at ?? new Date().toISOString(),
            } as Product,
          ],
    );
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
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          gridColumns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            shopId={shopId}
            shopOpen={shopOpen}
            isAuthed={isAuthed}
            isOwner={isOwner}
            userId={userId}
            initialAuction={initialAuctionsByProductId[product.id] ?? null}
            onOpenDetails={() => setOpenId(product.id)}
          />
        ))}
      </div>

      {openProduct && (
        <ProductDetailDialog
          product={openProduct}
          shopId={shopId}
          shopOpen={shopOpen}
          isAuthed={isAuthed}
          isOwner={isOwner}
          userId={userId}
          initialAuction={initialAuctionsByProductId[openProduct.id] ?? null}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function ProductCard({
  product,
  shopId,
  shopOpen,
  isAuthed,
  isOwner,
  userId,
  initialAuction,
  onOpenDetails,
}: {
  product: Product;
  shopId: string;
  shopOpen: boolean;
  isAuthed: boolean;
  isOwner: boolean;
  userId: string | null;
  initialAuction: AuctionActionState | null;
  onOpenDetails: () => void;
}) {
  const photos = photosOf(product);
  const discounted = isFlashDiscounted(product);
  const soldOut = product.quantity <= 0;
  const isAuction = product.sale_type === "auction";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow",
        discounted ? "border-primary/60 glow-primary" : "border-border",
        isAuction && "border-accent/50",
      )}
    >
      <Gallery
        photos={photos}
        alt={product.title}
        onImageClick={onOpenDetails}
        overlay={
          <>
            {isAuction && (
              <Badge variant="accent" className="absolute left-2 top-2">
                Auction
              </Badge>
            )}
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
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceBlock product={product} />
          {isAuction ? (
            <AuctionProductActions
              product={product}
              shopId={shopId}
              shopOpen={shopOpen}
              isAuthed={isAuthed}
              isOwner={isOwner}
              userId={userId}
              initial={initialAuction}
            />
          ) : (
            <BuyButton
              shopId={shopId}
              productId={product.id}
              isOpen={shopOpen}
              soldOut={soldOut}
              isAuthed={isAuthed}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDetailDialog({
  product,
  shopId,
  shopOpen,
  isAuthed,
  isOwner,
  userId,
  initialAuction,
  onClose,
}: {
  product: Product;
  shopId: string;
  shopOpen: boolean;
  isAuthed: boolean;
  isOwner: boolean;
  userId: string | null;
  initialAuction: AuctionActionState | null;
  onClose: () => void;
}) {
  const photos = photosOf(product);
  const soldOut = product.quantity <= 0;
  const isAuction = product.sale_type === "auction";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 pt-20 pb-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
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
          {isAuction && (
            <Badge variant="accent" className="absolute left-2 top-2">
              Auction
            </Badge>
          )}
        </div>
        <div className="space-y-3 p-5">
          <h2 className="text-xl font-bold">{product.title}</h2>
          {product.description && (
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{product.description}</p>
          )}
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
            <PriceBlock product={product} />
            {isAuction ? (
              <AuctionProductActions
                product={product}
                shopId={shopId}
                shopOpen={shopOpen}
                isAuthed={isAuthed}
                isOwner={isOwner}
                userId={userId}
                initial={initialAuction}
              />
            ) : (
              <BuyButton
                shopId={shopId}
                productId={product.id}
                isOpen={shopOpen}
                soldOut={soldOut}
                isAuthed={isAuthed}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PriceBlock({ product }: { product: Product }) {
  const discounted = isFlashDiscounted(product);
  const soldOut = product.quantity <= 0;
  const isAuction = product.sale_type === "auction";
  const displayPrice = productDisplayPrice(product);

  return (
    <div>
      {isAuction ? (
        discounted ? (
          <div className="flex items-baseline gap-2">
            <span
              key={product.discount_price}
              className="animate-price-pop text-lg font-bold text-live"
            >
              Starting {formatCurrency(displayPrice)}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.price)}
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold">Starting {formatCurrency(displayPrice)}</span>
        )
      ) : discounted ? (
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
      <p className="text-xs text-muted-foreground">
        {isAuction ? "1-of-1 lot" : soldOut ? "Out of stock" : `${product.quantity} left`}
        {" · "}
        {(product.shipping_rate ?? 0) > 0
          ? `+${formatCurrency(product.shipping_rate)} shipping`
          : "Free shipping"}
      </p>
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
