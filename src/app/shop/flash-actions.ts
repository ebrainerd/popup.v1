"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/utils";
import {
  DEFAULT_AUCTION_DURATION,
  MIN_INCREMENT_CENTS,
} from "@/lib/auction-bidding";
import type { FlashItemBroadcast } from "@/lib/realtime";

async function ownerClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export type FlashDiscountResult =
  | { ok: true; productId: string; discountPrice: number; auctionStartingBid?: number }
  | { ok: false; error: string };

async function productHasAuctionBids(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("auction_runs")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId)
    .gt("bid_count", 0);
  if (error) return true;
  return (count ?? 0) > 0;
}

/** Apply a temporary discount to an existing product. */
export async function setFlashDiscount(
  productId: string,
  discountDollars: number,
): Promise<FlashDiscountResult> {
  const { supabase, user } = await ownerClient();
  if (!user) return { ok: false, error: "Not authenticated." };

  const discountPrice = toCents(discountDollars);

  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, shop_id, price, sale_type, auction_starting_bid")
    .eq("id", productId)
    .single();

  if (loadError || !product) {
    return { ok: false, error: loadError?.message ?? "Product not found." };
  }

  const listPrice = product.price;
  if (discountPrice >= listPrice) {
    return {
      ok: false,
      error:
        product.sale_type === "auction"
          ? "Flash price must be lower than the starting bid."
          : "Discount must be lower than the current price.",
    };
  }
  if (discountPrice < 50) {
    return { ok: false, error: "Flash price must be at least $0.50 (the payment minimum)." };
  }

  if (product.sale_type === "auction") {
    if (await productHasAuctionBids(supabase, productId)) {
      return {
        ok: false,
        error: "Flash deals can't apply after bidding has started on this auction.",
      };
    }
  }

  const updates =
    product.sale_type === "auction"
      ? { discount_price: discountPrice, auction_starting_bid: discountPrice }
      : { discount_price: discountPrice };

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select("id, shop_id, sale_type")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not apply discount." };

  if (product.sale_type === "auction") {
    await supabase
      .from("auction_runs")
      .update({ starting_bid: discountPrice, current_bid: discountPrice })
      .eq("product_id", productId)
      .eq("bid_count", 0)
      .in("status", ["queued", "live"]);
  }

  revalidatePath(`/shop/${data.shop_id}`);
  return {
    ok: true,
    productId,
    discountPrice,
    auctionStartingBid: product.sale_type === "auction" ? discountPrice : undefined,
  };
}

export type FlashClearResult = { ok: boolean; error?: string; shopId?: string };

export async function clearFlashDiscount(productId: string): Promise<FlashClearResult> {
  const { supabase, user } = await ownerClient();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("shop_id, price, sale_type")
    .eq("id", productId)
    .single();
  if (loadError || !product) {
    return { ok: false, error: loadError?.message ?? "Product not found." };
  }

  const updates =
    product.sale_type === "auction"
      ? { discount_price: null, auction_starting_bid: product.price }
      : { discount_price: null };

  const { error } = await supabase.from("products").update(updates).eq("id", productId);
  if (error) return { ok: false, error: error.message };

  if (product.sale_type === "auction") {
    await supabase
      .from("auction_runs")
      .update({ starting_bid: product.price, current_bid: product.price })
      .eq("product_id", productId)
      .eq("bid_count", 0)
      .in("status", ["queued", "live"]);
  }

  revalidatePath(`/shop/${product.shop_id}`);
  return { ok: true, shopId: product.shop_id };
}

const MIN_PRICE_USD = 0.5;

const flashItemSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(140),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    sale_type: z.enum(["buy_now", "auction"]).default("buy_now"),
    price: z.coerce.number().min(0).max(1_000_000),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    photo_url: z.string().url().optional().or(z.literal("")),
    auction_starting_bid: z.coerce.number().min(0).optional(),
    auction_min_increment: z.coerce.number().min(0).optional(),
    auction_duration_seconds: z.coerce.number().int().min(0).optional(),
    auction_allow_prebids: z.boolean().optional(),
    auction_sudden_death: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.sale_type === "buy_now") {
      if (d.price < MIN_PRICE_USD) {
        ctx.addIssue({
          code: "custom",
          message: "Price must be at least $0.50 (the payment minimum).",
          path: ["price"],
        });
      }
      return;
    }

    const start = d.auction_starting_bid ?? d.price;
    const inc = d.auction_min_increment ?? 0;
    if (start < MIN_PRICE_USD) {
      ctx.addIssue({
        code: "custom",
        message: "Starting bid must be at least $0.50.",
        path: ["auction_starting_bid"],
      });
    }
    if (inc < MIN_INCREMENT_CENTS / 100) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum increment must be at least $0.50.",
        path: ["auction_min_increment"],
      });
    }
    if (!d.auction_duration_seconds || d.auction_duration_seconds < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Choose an auction duration.",
        path: ["auction_duration_seconds"],
      });
    }
    if (d.quantity !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Auction quantity must be 1.",
        path: ["quantity"],
      });
    }
  });

export type FlashItemResult =
  | { ok: true; product: FlashItemBroadcast }
  | { ok: false; error: string };

const FLASH_ITEM_SELECT =
  "id, shop_id, title, description, photo_url, photo_urls, price, quantity, discount_price, is_flash_only, flash_expires_at, sale_type, auction_starting_bid, auction_min_increment, auction_duration_seconds, auction_allow_prebids, auction_sudden_death, shipping_rate, created_at";

/** Create a flash-only item that exists only while the shop is open. */
export async function createFlashItem(
  shopId: string,
  input: {
    title: string;
    description?: string;
    sale_type?: "buy_now" | "auction";
    price: number;
    quantity: number;
    photo_url?: string;
    auction_starting_bid?: number;
    auction_min_increment?: number;
    auction_duration_seconds?: number;
    auction_allow_prebids?: boolean;
    auction_sudden_death?: boolean;
  },
): Promise<FlashItemResult> {
  const { supabase, user } = await ownerClient();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsed = flashItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("id, end_at")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shop not found." };

  const isAuction = parsed.data.sale_type === "auction";
  const startingCents = isAuction
    ? toCents(parsed.data.auction_starting_bid ?? parsed.data.price)
    : toCents(parsed.data.price);
  const photoUrl = parsed.data.photo_url || null;
  const photoUrls = photoUrl ? [photoUrl] : [];

  const { data, error } = await supabase
    .from("products")
    .insert({
      shop_id: shopId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      photo_url: photoUrl,
      photo_urls: photoUrls,
      sale_type: parsed.data.sale_type,
      price: isAuction ? startingCents : toCents(parsed.data.price),
      quantity: isAuction ? 1 : parsed.data.quantity,
      is_flash_only: true,
      flash_expires_at: shop.end_at,
      auction_starting_bid: isAuction ? startingCents : null,
      auction_min_increment: isAuction
        ? toCents(parsed.data.auction_min_increment ?? 1)
        : null,
      auction_duration_seconds: isAuction
        ? parsed.data.auction_duration_seconds ?? DEFAULT_AUCTION_DURATION
        : null,
      auction_allow_prebids: isAuction ? parsed.data.auction_allow_prebids !== false : true,
      auction_sudden_death: isAuction ? Boolean(parsed.data.auction_sudden_death) : false,
    })
    .select(FLASH_ITEM_SELECT)
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create flash item." };

  revalidatePath(`/shop/${shopId}`);
  return { ok: true, product: data as FlashItemBroadcast };
}
