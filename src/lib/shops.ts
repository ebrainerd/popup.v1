import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product, Profile, Shop } from "@/lib/database.types";
import type { ChatBroadcast } from "@/lib/realtime";

export type ShopWithSeller = Shop & {
  seller: Pick<
    Profile,
    "id" | "username" | "display_name" | "avatar_url" | "rating_avg" | "rating_count" | "follower_count"
  > | null;
};

export type ShopWithDetails = ShopWithSeller & {
  products: Product[];
};

const SELLER_FIELDS =
  "id, username, display_name, avatar_url, rating_avg, rating_count, follower_count";

export type ExploreTab = "all" | "streaming" | "soon";
export type ExploreSort = "soonest" | "popular";

/** Public shops for the Explore feed, filtered by tab and sorted. */
export async function getExploreShops(
  tab: ExploreTab = "all",
  sort: ExploreSort = "soonest",
): Promise<ShopWithSeller[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("shops")
    .select(`*, seller:profiles!shops_seller_id_fkey(${SELLER_FIELDS})`)
    .eq("visibility", "public")
    .neq("status", "draft");

  if (tab === "streaming") {
    // Shops with an active live stream running right now.
    query = query.eq("is_live", true).lte("start_at", nowIso).gt("end_at", nowIso);
  } else if (tab === "soon") {
    query = query.gt("start_at", nowIso);
  } else {
    // Everything that hasn't ended yet (open + opening soon).
    query = query.gt("end_at", nowIso);
  }

  // Fetch soonest-first; for "popular" we re-rank in app by seller reach
  // (a wider window so popular shops aren't truncated by the time sort).
  query = query.order("start_at", { ascending: true }).limit(sort === "popular" ? 120 : 48);

  const { data, error } = await query;
  if (error) {
    console.error("getExploreShops error", error.message);
    return [];
  }

  if (sort === "popular") {
    const ranked = (data ?? []) as unknown as ShopWithSeller[];
    return ranked
      .slice()
      .sort((a, b) => {
        const fa = a.seller?.follower_count ?? 0;
        const fb = b.seller?.follower_count ?? 0;
        if (fb !== fa) return fb - fa;
        return (b.seller?.rating_avg ?? 0) - (a.seller?.rating_avg ?? 0);
      })
      .slice(0, 48);
  }
  return (data ?? []) as unknown as ShopWithSeller[];
}

/** Search public, published shops by name. */
export async function searchShops(query: string): Promise<ShopWithSeller[]> {
  const term = query.replace(/[%,()*\\]/g, "").trim();
  if (!term) return [];

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("shops")
    .select(`*, seller:profiles!shops_seller_id_fkey(${SELLER_FIELDS})`)
    .eq("visibility", "public")
    .neq("status", "draft")
    .gt("end_at", nowIso)
    .ilike("name", `%${term}%`)
    .order("start_at", { ascending: true })
    .limit(24);

  if (error) {
    console.error("searchShops error", error.message);
    return [];
  }
  return (data ?? []) as unknown as ShopWithSeller[];
}

/** A single shop with seller + visible products (used on the public shop page). */
export async function getShopWithDetails(shopId: string): Promise<ShopWithDetails | null> {
  const supabase = await createClient();

  const { data: shop, error } = await supabase
    .from("shops")
    .select(`*, seller:profiles!shops_seller_id_fkey(${SELLER_FIELDS})`)
    .eq("id", shopId)
    .maybeSingle();

  if (error || !shop) {
    if (error) console.error("getShopWithDetails error", error.message);
    return null;
  }

  const nowIso = new Date().toISOString();
  // Flash-only products are visible only while their flash window is active.
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .or(`is_flash_only.eq.false,flash_expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: true });

  return {
    ...(shop as unknown as ShopWithSeller),
    products: (products ?? []) as Product[],
  };
}

/** Most recent visible chat messages for a shop (oldest first), capped. */
export async function getChatMessages(shopId: string, limit = 200): Promise<ChatBroadcast[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, message, created_at, user:profiles!chat_messages_user_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("shop_id", shopId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("getChatMessages error", error.message);
    return [];
  }

  return (data as unknown as ChatBroadcast[]).slice().reverse();
}

/** All shops owned by a seller (dashboard). */
export async function getSellerShops(sellerId: string): Promise<Shop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("seller_id", sellerId)
    .order("start_at", { ascending: false });
  if (error) {
    console.error("getSellerShops error", error.message);
    return [];
  }
  return (data ?? []) as Shop[];
}

/** A single shop owned by the current seller, with its products. */
export async function getOwnedShopWithProducts(
  shopId: string,
  sellerId: string,
): Promise<ShopWithDetails | null> {
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select(`*, seller:profiles!shops_seller_id_fkey(${SELLER_FIELDS})`)
    .eq("id", shopId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (!shop) return null;

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  return {
    ...(shop as unknown as ShopWithSeller),
    products: (products ?? []) as Product[],
  };
}
