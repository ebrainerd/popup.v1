"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/utils";
import type { FlashItemBroadcast } from "@/lib/realtime";

async function ownerClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export type FlashDiscountResult =
  | { ok: true; productId: string; discountPrice: number }
  | { ok: false; error: string };

/** Apply a temporary discount to an existing product. */
export async function setFlashDiscount(
  productId: string,
  discountDollars: number,
): Promise<FlashDiscountResult> {
  const { supabase, user } = await ownerClient();
  if (!user) return { ok: false, error: "Not authenticated." };

  const discountPrice = toCents(discountDollars);

  // RLS (owns_shop) restricts this update to the shop owner.
  const { data, error } = await supabase
    .from("products")
    .update({ discount_price: discountPrice })
    .eq("id", productId)
    .select("id, shop_id, price")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not apply discount." };
  if (discountPrice >= data.price) {
    return { ok: false, error: "Discount must be lower than the current price." };
  }

  revalidatePath(`/shop/${data.shop_id}`);
  return { ok: true, productId, discountPrice };
}

export type FlashClearResult = { ok: boolean; error?: string; shopId?: string };

export async function clearFlashDiscount(productId: string): Promise<FlashClearResult> {
  const { supabase, user } = await ownerClient();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("products")
    .update({ discount_price: null })
    .eq("id", productId)
    .select("shop_id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not clear discount." };

  revalidatePath(`/shop/${data.shop_id}`);
  return { ok: true, shopId: data.shop_id };
}

const flashItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(140),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(1_000_000),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  photo_url: z.string().url().optional().or(z.literal("")),
});

export type FlashItemResult =
  | { ok: true; product: FlashItemBroadcast }
  | { ok: false; error: string };

/** Create a flash-only item that exists only while the shop is open. */
export async function createFlashItem(
  shopId: string,
  input: {
    title: string;
    description?: string;
    price: number;
    quantity: number;
    photo_url?: string;
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

  const { data, error } = await supabase
    .from("products")
    .insert({
      shop_id: shopId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: toCents(parsed.data.price),
      quantity: parsed.data.quantity,
      photo_url: parsed.data.photo_url || null,
      is_flash_only: true,
      flash_expires_at: shop.end_at,
    })
    .select(
      "id, shop_id, title, description, photo_url, price, quantity, discount_price, is_flash_only, flash_expires_at",
    )
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create flash item." };

  revalidatePath(`/shop/${shopId}`);
  return { ok: true, product: data as FlashItemBroadcast };
}
