import { sendChat } from "./chat.mjs";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sellerClient
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {import('@supabase/supabase-js').SupabaseClient} [anon]
 * @param {string} [draftShopId]
 */
export async function draftHiddenFromBuyer(sellerClient, buyerClient, anon, draftShopId) {
  let shopId = draftShopId;
  if (!shopId) {
    const { data, error } = await sellerClient
      .from("shops")
      .insert({
        seller_id: (await sellerClient.auth.getUser()).data.user?.id,
        name: "RLS draft shop",
        start_at: new Date(Date.now() + 3_600_000).toISOString(),
        end_at: new Date(Date.now() + 7_200_000).toISOString(),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    if (error) return { ok: false, detail: error.message };
    shopId = data.id;
  }

  const asOwner = await sellerClient.from("shops").select("id").eq("id", shopId).maybeSingle();
  const asBuyer = await buyerClient.from("shops").select("id").eq("id", shopId).maybeSingle();
  const asAnon = anon
    ? await anon.from("shops").select("id").eq("id", shopId).maybeSingle()
    : { data: null };

  const ok =
    asOwner.data?.id === shopId && asBuyer.data === null && (anon ? asAnon.data === null : true);

  return {
    ok,
    detail: ok
      ? "draft visible to owner only"
      : `owner=${Boolean(asOwner.data)} buyer=${Boolean(asBuyer.data)} anon=${Boolean(asAnon.data)}`,
    shopId,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} buyerId
 * @param {string} shopId
 * @param {string} productId
 */
export async function buyerCannotInsertOrder(buyerClient, buyerId, shopId, productId) {
  const { error } = await buyerClient
    .from("orders")
    .insert({
      buyer_id: buyerId,
      shop_id: shopId,
      product_id: productId,
      amount_paid: 500,
      status: "paid",
    })
    .select("id")
    .single();

  return {
    ok: Boolean(error),
    detail: error ? `blocked: ${error.message}` : "buyer was able to insert order",
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sellerClient
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} sellerId
 * @param {string} buyerId
 * @param {string} [shopId]
 */
export async function mutedCannotChat(sellerClient, buyerClient, sellerId, buyerId, shopId) {
  let liveShopId = shopId;
  if (!liveShopId) {
    const { data: shop, error } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Mute test shop",
        start_at: new Date(Date.now() - 3_600_000).toISOString(),
        end_at: new Date(Date.now() + 7_200_000).toISOString(),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    if (error) return { ok: false, detail: error.message };
    liveShopId = shop.id;
    await sellerClient.from("products").insert({ shop_id: liveShopId, title: "Item", price: 100 });
    await sellerClient.from("shops").update({ status: "open" }).eq("id", liveShopId);
  }

  const before = await sendChat(buyerClient, liveShopId, "hello");
  if (!before.ok) {
    return { ok: false, detail: `pre-mute chat failed: ${before.error}` };
  }

  await sellerClient.from("shop_mutes").insert({
    shop_id: liveShopId,
    user_id: buyerId,
    muted_by: sellerId,
  });

  const after = await sendChat(buyerClient, liveShopId, "blocked");
  return {
    ok: !after.ok,
    detail: after.ok ? "muted user posted chat" : (after.error ?? "blocked"),
    shopId: liveShopId,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} buyerId
 * @param {string} sellerId
 * @param {string} orderId
 */
export async function cannotRateUnpaid(buyerClient, buyerId, sellerId, orderId) {
  const { error } = await buyerClient.from("ratings").insert({
    rater_id: buyerId,
    seller_id: sellerId,
    order_id: orderId,
    stars: 5,
  });

  return {
    ok: Boolean(error),
    detail: error ? `blocked: ${error.message}` : "rated paid (unreceived) order",
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} productId
 */
export async function stockNeverNegative(admin, productId) {
  const { data, error } = await admin
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .maybeSingle();

  if (error) return { ok: false, detail: error.message };
  const qty = data?.quantity ?? 0;
  return {
    ok: qty >= 0,
    detail: qty >= 0 ? `quantity=${qty}` : `negative stock: ${qty}`,
    quantity: qty,
  };
}
