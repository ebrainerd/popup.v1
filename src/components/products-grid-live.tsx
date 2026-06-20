"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { useShopEvent } from "@/components/shop-room";
import { BuyButton } from "@/components/buy-button";
import { Badge } from "@/components/ui/badge";
import {
  ROOM_EVENTS,
  type FlashPriceBroadcast,
  type FlashClearBroadcast,
  type FlashItemBroadcast,
} from "@/lib/realtime";
import type { Product } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";

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

  useShopEvent(ROOM_EVENTS.flashPrice, (payload) => {
    const { productId, discountPrice } = payload as FlashPriceBroadcast;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, discount_price: discountPrice } : p)),
    );
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
  });

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        No products listed yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products.map((product) => {
        const discounted =
          product.discount_price != null && product.discount_price < product.price;
        const soldOut = product.quantity <= 0;
        return (
          <div
            key={product.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="relative aspect-square w-full bg-muted">
              {product.photo_url ? (
                <Image
                  src={product.photo_url}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Package className="size-8" />
                </div>
              )}
              {product.is_flash_only && (
                <Badge variant="accent" className="absolute left-2 top-2">
                  Flash item
                </Badge>
              )}
              {discounted && (
                <Badge variant="live" className="absolute right-2 top-2 animate-live-pulse">
                  Flash deal
                </Badge>
              )}
              {soldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Badge variant="muted">Sold out</Badge>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-semibold">{product.title}</h3>
              {product.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
              )}
              <div className="mt-auto flex items-end justify-between pt-2">
                <div>
                  {discounted ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-live">
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
                    {soldOut ? "Out of stock" : `${product.quantity} left`}
                  </p>
                </div>
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
      })}
    </div>
  );
}
