const MIN_AUCTION_CENTS = 50;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Insert a shop via service role (fast path for published states).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} sellerId
 * @param {{ name: string, startAt: string, endAt: string, status: string } & Record<string, unknown>} fields
 * @returns {Promise<string>} shop id
 */
export async function createShop(admin, sellerId, fields) {
  const { name, startAt, endAt, status, ...rest } = fields;
  const row = {
    seller_id: sellerId,
    name,
    slug: rest.slug ?? slugify(name),
    start_at: startAt,
    end_at: endAt,
    status,
    visibility: rest.visibility ?? "public",
    shipping_rate: rest.shipping_rate ?? 600,
    schedule_set: rest.schedule_set ?? status !== "draft",
    is_live: rest.is_live ?? false,
    description: rest.description ?? null,
    cover_url: rest.cover_url ?? null,
    shop_theme: rest.shop_theme ?? null,
    ...rest,
  };

  const { data, error } = await admin
    .from("shops")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(`createShop(${name}): ${error.message}`);
  return data.id;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} shopId
 * @param {{ title: string, price: number } & Record<string, unknown>} fields price in cents
 */
export async function createBuyNowProduct(admin, shopId, fields) {
  const { title, price, ...rest } = fields;
  if (price < 0) throw new Error(`createBuyNowProduct: price must be >= 0`);

  const row = {
    shop_id: shopId,
    title,
    price,
    sale_type: "buy_now",
    quantity: rest.quantity ?? 1,
    is_flash_only: rest.is_flash_only ?? false,
    description: rest.description ?? null,
    photo_url: rest.photo_url ?? null,
    photo_urls: rest.photo_urls ?? null,
    ...rest,
  };

  const { data, error } = await admin
    .from("products")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(`createBuyNowProduct(${title}): ${error.message}`);
  return data.id;
}

/**
 * Auction lot — quantity 1; auction_* fields must be >= 50 cents.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} shopId
 * @param {{ title: string, auction_starting_bid: number, auction_min_increment: number, auction_duration_seconds: number } & Record<string, unknown>} fields
 */
export async function createAuctionProduct(admin, shopId, fields) {
  const {
    title,
    auction_starting_bid,
    auction_min_increment,
    auction_duration_seconds,
    ...rest
  } = fields;

  for (const [key, value] of [
    ["auction_starting_bid", auction_starting_bid],
    ["auction_min_increment", auction_min_increment],
  ]) {
    if (value < MIN_AUCTION_CENTS) {
      throw new Error(
        `createAuctionProduct: ${key} must be >= ${MIN_AUCTION_CENTS} cents`,
      );
    }
  }
  if (auction_duration_seconds <= 0) {
    throw new Error("createAuctionProduct: auction_duration_seconds must be > 0");
  }

  const row = {
    shop_id: shopId,
    title,
    price: rest.price ?? auction_starting_bid,
    sale_type: "auction",
    quantity: 1,
    auction_starting_bid,
    auction_min_increment,
    auction_duration_seconds,
    auction_allow_prebids: rest.auction_allow_prebids ?? true,
    auction_sudden_death: rest.auction_sudden_death ?? false,
    is_flash_only: false,
    description: rest.description ?? null,
    photo_url: rest.photo_url ?? null,
    photo_urls: rest.photo_urls ?? null,
    ...rest,
  };

  const { data, error } = await admin
    .from("products")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(`createAuctionProduct(${title}): ${error.message}`);
  return data.id;
}
