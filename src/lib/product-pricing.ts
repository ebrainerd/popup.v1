import type { Product } from "@/lib/database.types";

/** Original list price used for flash-deal comparisons (unchanged by auction flash). */
export function productListPrice(product: Pick<Product, "price">): number {
  return product.price;
}

export function isFlashDiscounted(
  product: Pick<Product, "price" | "discount_price">,
): boolean {
  return product.discount_price != null && product.discount_price < product.price;
}

/** Starting bid shown to buyers; flash deals lower this when no bids exist yet. */
export function effectiveAuctionStartingBid(
  product: Pick<Product, "price" | "auction_starting_bid" | "discount_price">,
): number {
  if (isFlashDiscounted(product)) {
    return product.discount_price!;
  }
  return product.auction_starting_bid ?? product.price;
}

export function productDisplayPrice(
  product: Pick<Product, "price" | "sale_type" | "auction_starting_bid" | "discount_price">,
): number {
  if (product.sale_type === "auction") {
    return effectiveAuctionStartingBid(product);
  }
  if (isFlashDiscounted(product)) {
    return product.discount_price!;
  }
  return product.price;
}
