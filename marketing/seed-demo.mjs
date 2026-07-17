#!/usr/bin/env node
/**
 * Seeds a rich marketing demo seller for screenshot capture.
 *
 *   node marketing/seed-demo.mjs
 *
 * Requires local Supabase (supabase start). Uses SUPABASE_SERVICE_ROLE_KEY from
 * `supabase status` when not set in the environment.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AVATAR,
  COVER_HOLIDAY,
  COVER_LIVE,
  COVER_STUDIO,
  COVER_SUMMER,
  COVER_WINTER,
  PRODUCTS,
} from "./demo-images.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SELLER_EMAIL = "marketing@popupdrop.co";
const SELLER_PASSWORD = "marketing-demo-2026";
const SELLER_USERNAME = "maya.clay";

const URL = process.env.MARKETING_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE =
  process.env.MARKETING_SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const past = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const future = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
const ago = (m) => new Date(Date.now() - m * 60_000).toISOString();

const BUYERS = [
  { username: "jordan.k", display: "Jordan K." },
  { username: "sam.creates", display: "Sam Rivera" },
  { username: "lily.home", display: "Lily Chen" },
  { username: "mike.pickup", display: "Mike Torres" },
  { username: "ava.studio", display: "Ava Brooks" },
  { username: "noah.ceramics", display: "Noah Park" },
  { username: "ella.makes", display: "Ella Wright" },
  { username: "kai.collects", display: "Kai Johnson" },
];

const CHAT_LINES = [
  { user: "jordan.k", body: "the speckled mugs are INSANE 😍" },
  { user: "sam.creates", body: "just grabbed the ocean bowl!!" },
  { user: "lily.home", body: "do you ship to portland?" },
  { user: "maya.clay", body: "yes! flat $6 shipping anywhere in the US 🫶" },
  { user: "mike.pickup", body: "mug sold out already?? dang" },
  { user: "ava.studio", body: "love watching you glaze live" },
  { user: "noah.ceramics", body: "mini vase set is so cute" },
  { user: "ella.makes", body: "remind me when the next drop is!!" },
  { user: "kai.collects", body: "snagged the ring dish 💍" },
  { user: "jordan.k", body: "this chat + checkout combo is so smooth" },
  { user: "sam.creates", body: "how many planters left?" },
  { user: "maya.clay", body: "3 planters left — go go go!" },
];

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureSeller() {
  let user = await findUserByEmail(SELLER_EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: SELLER_USERNAME,
        full_name: "Maya Clay",
        avatar_url: AVATAR,
      },
    });
    if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
    user = data.user;
    console.log("created seller", SELLER_EMAIL);
  } else {
    await admin.auth.admin.updateUserById(user.id, { password: SELLER_PASSWORD });
    console.log("seller exists, password reset", SELLER_EMAIL);
  }

  await admin
    .from("profiles")
    .update({
      username: SELLER_USERNAME,
      display_name: "Maya Clay",
      avatar_url: AVATAR,
      bio: "Hand-thrown ceramics from my Portland studio. Small batches, big energy.",
      stripe_onboarded: true,
      seller_terms_accepted_at: new Date().toISOString(),
      profile_setup_complete: true,
      rating_avg: 4.9,
      rating_count: 47,
    })
    .eq("id", user.id);

  return user.id;
}

async function ensureBuyers() {
  const ids = {};
  for (const b of BUYERS) {
    const email = `${b.username}@demo.popupdrop.co`;
    let user = await findUserByEmail(email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: "demo-buyer-password",
        email_confirm: true,
        user_metadata: { username: b.username, full_name: b.display },
      });
      if (error || !data.user) throw new Error(`buyer ${b.username}: ${error?.message}`);
      user = data.user;
    }
    await admin
      .from("profiles")
      .update({ username: b.username, display_name: b.display, profile_setup_complete: true })
      .eq("id", user.id);
    ids[b.username] = user.id;
  }
  return ids;
}

async function wipeSellerData(sellerId) {
  const { data: shops } = await admin.from("shops").select("id").eq("seller_id", sellerId);
  const shopIds = (shops ?? []).map((s) => s.id);
  if (shopIds.length === 0) return;

  await admin.from("chat_messages").delete().in("shop_id", shopIds);
  await admin.from("orders").delete().in("shop_id", shopIds);
  await admin.from("products").delete().in("shop_id", shopIds);
  await admin.from("shops").delete().eq("seller_id", sellerId);
}

async function insertShop(sellerId, shop) {
  const { data, error } = await admin.from("shops").insert(shop).select("id").single();
  if (error) throw new Error(`shop ${shop.name}: ${error.message}`);
  return data.id;
}

async function insertProducts(shopId, products) {
  const rows = products.map((p) => ({ shop_id: shopId, is_flash_only: false, ...p }));
  const { data, error } = await admin.from("products").insert(rows).select("id, title");
  if (error) throw new Error(`products: ${error.message}`);
  return data;
}

async function insertOrders(shopId, orders, productByTitle, buyerIds) {
  for (const o of orders) {
    const productId = productByTitle[o.productTitle];
    const buyerId = buyerIds[o.buyer];
    if (!productId || !buyerId) continue;
    const { error } = await admin.from("orders").insert({
      shop_id: shopId,
      buyer_id: buyerId,
      product_id: productId,
      amount_paid: o.amount,
      platform_fee: Math.round(o.amount * 0.05),
      status: o.status,
      tracking_number: o.tracking ?? null,
      carrier: o.carrier ?? null,
      shipped_at: o.shippedAt ?? null,
      released_at: o.releasedAt ?? null,
      created_at: o.createdAt ?? new Date().toISOString(),
      shipping_address: {
        name: o.shipName,
        address: {
          line1: o.line1,
          city: o.city,
          state: o.state,
          postal_code: o.zip,
          country: "US",
        },
      },
    });
    if (error) throw new Error(`order: ${error.message}`);
  }
}

async function insertChat(shopId, sellerId, buyerIds) {
  for (let i = 0; i < CHAT_LINES.length; i++) {
    const line = CHAT_LINES[i];
    const userId = line.user === "maya.clay" ? sellerId : buyerIds[line.user];
    if (!userId) continue;
    const { error } = await admin.from("chat_messages").insert({
      shop_id: shopId,
      user_id: userId,
      message: line.body,
      created_at: ago(CHAT_LINES.length - i),
    });
    if (error) throw new Error(`chat: ${error.message}`);
  }
}

async function main() {
  const sellerId = await ensureSeller();
  const buyerIds = await ensureBuyers();
  await wipeSellerData(sellerId);

  const theme = {
    preset: "market_stall",
    layout: "classic",
    accent: "#ff5c1a",
    background: "gradient",
    productGridColumns: 3,
    showChat: true,
    showSellerBio: true,
    showReminderCta: true,
  };

  // Live drop — open now, streaming
  const liveShopId = await insertShop(sellerId, {
    seller_id: sellerId,
    name: "Spring Studio Drop",
    slug: "spring-studio-drop",
    description:
      "Fresh from the kiln: mugs, bowls, and one-of-a-kind vases. Limited window — when they're gone, they're gone.",
    cover_url: COVER_LIVE,
    start_at: past(2),
    end_at: future(4),
    visibility: "public",
    shipping_rate: 600,
    is_live: true,
    live_url: null,
    stream_provider: "none",
    status: "open",
    schedule_set: true,
    shop_theme: theme,
    featured_at: past(1),
  });

  const liveProducts = await insertProducts(liveShopId, [
    { title: "Speckled Mug", description: "16oz wheel-thrown mug, matte speckle glaze.", photo_url: PRODUCTS.mug, photo_urls: [PRODUCTS.mug], price: 4200, quantity: 0 },
    { title: "Ocean Glaze Bowl", description: "Serving bowl with layered blue-green glaze.", photo_url: PRODUCTS.bowl, photo_urls: [PRODUCTS.bowl], price: 6800, quantity: 2 },
    { title: "Mini Vase Set (3)", description: "Three bud vases, perfect shelfie trio.", photo_url: PRODUCTS.vaseSet, photo_urls: [PRODUCTS.vaseSet], price: 5500, quantity: 4 },
    { title: "Stoneware Candle Holder", description: "Fits standard taper candles.", photo_url: PRODUCTS.candle, photo_urls: [PRODUCTS.candle], price: 3800, quantity: 5 },
    { title: "Studio Dinner Plate", description: "10\" plate, food-safe glossy white.", photo_url: PRODUCTS.plate, photo_urls: [PRODUCTS.plate], price: 4800, quantity: 0 },
    { title: "Sunset Ring Dish", description: "Catch-all tray for rings and keys.", photo_url: PRODUCTS.ringDish, photo_urls: [PRODUCTS.ringDish], price: 3200, quantity: 1 },
    { title: "Matte Planter", description: "4\" planter with drainage hole.", photo_url: PRODUCTS.planter, photo_urls: [PRODUCTS.planter], price: 5200, quantity: 3 },
    { title: "Limited Edition Vase", description: "One-of-one tall vase, signed on base.", photo_url: PRODUCTS.limitedVase, photo_urls: [PRODUCTS.limitedVase], price: 8500, quantity: 1, is_flash_only: true },
  ]);

  const liveByTitle = Object.fromEntries(liveProducts.map((p) => [p.title, p.id]));

  await insertOrders(liveShopId, [
    { productTitle: "Speckled Mug", buyer: "jordan.k", amount: 4800, status: "paid", shipName: "Jordan K.", line1: "1420 NE Alberta St", city: "Portland", state: "OR", zip: "97211", createdAt: ago(38) },
    { productTitle: "Ocean Glaze Bowl", buyer: "sam.creates", amount: 7400, status: "paid", shipName: "Sam Rivera", line1: "88 Valencia St", city: "San Francisco", state: "CA", zip: "94103", createdAt: ago(31) },
    { productTitle: "Sunset Ring Dish", buyer: "kai.collects", amount: 3800, status: "paid", shipName: "Kai Johnson", line1: "2200 S Lamar Blvd", city: "Austin", state: "TX", zip: "78704", createdAt: ago(24) },
    { productTitle: "Mini Vase Set (3)", buyer: "ava.studio", amount: 6100, status: "shipped", shipName: "Ava Brooks", line1: "401 Broadway", city: "Nashville", state: "TN", zip: "37203", tracking: "9400111899223344556677", carrier: "USPS", shippedAt: ago(18), createdAt: ago(52) },
    { productTitle: "Stoneware Candle Holder", buyer: "lily.home", amount: 4400, status: "shipped", shipName: "Lily Chen", line1: "901 Pine St", city: "Seattle", state: "WA", zip: "98101", tracking: "1Z999AA10123456784", carrier: "UPS", shippedAt: ago(12), releasedAt: ago(10), createdAt: ago(65) },
    { productTitle: "Matte Planter", buyer: "noah.ceramics", amount: 5800, status: "delivered", shipName: "Noah Park", line1: "55 Water St", city: "Brooklyn", state: "NY", zip: "11201", tracking: "9400111899223344556688", carrier: "USPS", shippedAt: ago(96), createdAt: ago(120) },
    { productTitle: "Studio Dinner Plate", buyer: "mike.pickup", amount: 5400, status: "delivered", shipName: "Mike Torres", line1: "300 Michigan Ave", city: "Chicago", state: "IL", zip: "60601", tracking: "1Z999AA10123456785", carrier: "UPS", shippedAt: ago(140), createdAt: ago(160) },
    { productTitle: "Limited Edition Vase", buyer: "ella.makes", amount: 9100, status: "received", shipName: "Ella Wright", line1: "1200 Larimer St", city: "Denver", state: "CO", zip: "80204", tracking: "9400111899223344556699", carrier: "USPS", shippedAt: ago(200), releasedAt: ago(190), createdAt: ago(220) },
  ], liveByTitle, buyerIds);

  await insertChat(liveShopId, sellerId, buyerIds);

  // Upcoming drop
  await insertShop(sellerId, {
    seller_id: sellerId,
    name: "Summer Glaze Preview",
    slug: "summer-glaze-preview",
    description: "Sneak peek at new summer glazes — remind me to get early access.",
    cover_url: COVER_SUMMER,
    start_at: future(72),
    end_at: future(76),
    visibility: "public",
    shipping_rate: 600,
    is_live: false,
    status: "scheduled",
    schedule_set: true,
    shop_theme: { ...theme, layout: "catalog", preset: "gallery" },
  });

  // Ended drop
  const endedShopId = await insertShop(sellerId, {
    seller_id: sellerId,
    name: "Winter Collection",
    slug: "winter-collection",
    description: "Cozy mugs and warm-toned bowls from the winter kiln.",
    cover_url: COVER_WINTER,
    start_at: past(240),
    end_at: past(232),
    visibility: "public",
    shipping_rate: 600,
    is_live: false,
    status: "ended",
    schedule_set: true,
    shop_theme: theme,
  });

  await insertProducts(endedShopId, [
    { title: "Cozy Cocoa Mug", description: "Sold out", photo_url: PRODUCTS.mug, photo_urls: [PRODUCTS.mug], price: 3800, quantity: 0 },
    { title: "Frost Bowl", description: "Sold out", photo_url: PRODUCTS.bowl, photo_urls: [PRODUCTS.bowl], price: 6200, quantity: 0 },
  ]);

  // Draft studio showcase (for create-shop marketing screenshot)
  const studioDraftId = await insertShop(sellerId, {
    seller_id: sellerId,
    name: "Autumn Kiln Drop",
    slug: "autumn-kiln-drop",
    description:
      "Warm-toned mugs, bud vases, and catch-all dishes — thrown fresh this week in my Portland studio.",
    cover_url: COVER_STUDIO,
    start_at: future(48),
    end_at: future(52),
    visibility: "public",
    shipping_rate: 600,
    is_live: false,
    status: "draft",
    schedule_set: true,
    shop_theme: theme,
  });

  await insertProducts(studioDraftId, [
    { title: "Harvest Mug", description: "16oz mug with rust speckle glaze.", photo_url: PRODUCTS.mug, photo_urls: [PRODUCTS.mug], price: 3800, quantity: 6 },
    { title: "Amber Bud Vase", description: "Perfect for a single stem.", photo_url: PRODUCTS.vaseSet, photo_urls: [PRODUCTS.vaseSet], price: 4200, quantity: 4 },
    { title: "Cinnamon Bowl", description: "Serving bowl with layered glaze.", photo_url: PRODUCTS.bowl, photo_urls: [PRODUCTS.bowl], price: 5800, quantity: 3 },
    { title: "Catch-All Dish", description: "For keys, rings, and tiny treasures.", photo_url: PRODUCTS.ringDish, photo_urls: [PRODUCTS.ringDish], price: 2800, quantity: 8 },
    { title: "Taper Candle Holder", description: "Stoneware, fits standard tapers.", photo_url: PRODUCTS.candle, photo_urls: [PRODUCTS.candle], price: 3400, quantity: 5 },
    { title: "Limited Glaze Vase", description: "One-of-one tall vase.", photo_url: PRODUCTS.limitedVase, photo_urls: [PRODUCTS.limitedVase], price: 7200, quantity: 1 },
  ]);

  // Draft
  await insertShop(sellerId, {
    seller_id: sellerId,
    name: "Holiday Ornaments",
    slug: "holiday-ornaments",
    description: "Hand-painted ceramic ornaments for the holidays.",
    cover_url: COVER_HOLIDAY,
    start_at: future(1),
    end_at: future(3),
    visibility: "private",
    shipping_rate: 500,
    is_live: false,
    status: "draft",
    schedule_set: false,
    shop_theme: theme,
  });

  const state = {
    sellerEmail: SELLER_EMAIL,
    sellerPassword: SELLER_PASSWORD,
    sellerUsername: SELLER_USERNAME,
    liveShopId,
    liveShopUrl: `/shop/${liveShopId}`,
    studioDraftId,
    studioSetupUrl: `/dashboard/shops/${studioDraftId}/setup`,
  };

  const outPath = join(__dirname, "demo-state.json");
  writeFileSync(outPath, JSON.stringify(state, null, 2));
  console.log("\nDemo seeded successfully!");
  console.log(`  Seller: ${SELLER_EMAIL} / ${SELLER_PASSWORD}`);
  console.log(`  Live shop: http://localhost:3000/shop/${liveShopId}`);
  console.log(`  State written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
