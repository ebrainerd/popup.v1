import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/database.types";

export type BuyerOrder = Order & {
  product: { title: string; photo_url: string | null } | null;
  shop: {
    id: string;
    name: string;
    seller_id: string;
    seller: { username: string; display_name: string | null } | null;
  } | null;
  hasRating: boolean;
};

export type SellerOrder = Order & {
  product: { title: string; photo_url: string | null } | null;
  buyer: { username: string; display_name: string | null } | null;
  /** Present when fetched across shops (dashboard sales view). */
  shop?: { id: string; name: string } | null;
};

export async function getBuyerOrders(userId: string): Promise<BuyerOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       product:products!orders_product_id_fkey(title, photo_url),
       shop:shops!orders_shop_id_fkey(id, name, seller_id, seller:profiles!shops_seller_id_fkey(username, display_name))`,
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("getBuyerOrders error", error.message);
    return [];
  }

  const orders = data as unknown as Omit<BuyerOrder, "hasRating">[];
  const ids = orders.map((o) => o.id);
  const ratedIds = new Set<string>();
  if (ids.length > 0) {
    const { data: ratings } = await supabase
      .from("ratings")
      .select("order_id")
      .in("order_id", ids);
    (ratings ?? []).forEach((r) => ratedIds.add(r.order_id));
  }

  return orders.map((o) => ({ ...o, hasRating: ratedIds.has(o.id) }));
}

/** Every order across all of a seller's shops, newest first. */
export async function getAllSellerOrders(sellerId: string): Promise<SellerOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       product:products!orders_product_id_fkey(title, photo_url),
       buyer:profiles!orders_buyer_id_fkey(username, display_name),
       shop:shops!orders_shop_id_fkey!inner(id, name, seller_id)`,
    )
    .eq("shop.seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("getAllSellerOrders error", error.message);
    return [];
  }
  return data as unknown as SellerOrder[];
}

export async function getSellerOrders(shopId: string): Promise<SellerOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       product:products!orders_product_id_fkey(title, photo_url),
       buyer:profiles!orders_buyer_id_fkey(username, display_name)`,
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("getSellerOrders error", error.message);
    return [];
  }
  return data as unknown as SellerOrder[];
}
