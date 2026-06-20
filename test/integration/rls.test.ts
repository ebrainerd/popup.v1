import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS integration tests — run against a REAL Supabase project with the
 * migrations applied (a disposable local or staging project, never prod).
 *
 *   TEST_SUPABASE_URL=...            \
 *   TEST_SUPABASE_ANON_KEY=...       \
 *   TEST_SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx vitest run test/integration/rls.test.ts
 *
 * Skipped automatically when those env vars aren't set (e.g. default CI).
 */
const URL = process.env.TEST_SUPABASE_URL;
const ANON = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(URL && ANON && SERVICE);

const futureIso = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const pastIso = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

describe.skipIf(!enabled)("Row Level Security", () => {
  let admin: SupabaseClient;
  let sellerClient: SupabaseClient;
  let buyerClient: SupabaseClient;
  let anon: SupabaseClient;
  let sellerId = "";
  let buyerId = "";
  const created: string[] = [];

  async function makeUser(): Promise<{ id: string; client: SupabaseClient }> {
    const email = `test_${crypto.randomUUID()}@example.com`;
    const password = "password123!";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    created.push(data.user.id);
    const client = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`signIn failed: ${signInErr.message}`);
    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
    anon = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const seller = await makeUser();
    const buyer = await makeUser();
    sellerId = seller.id;
    buyerId = buyer.id;
    sellerClient = seller.client;
    buyerClient = buyer.client;
  });

  afterAll(async () => {
    for (const id of created) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  it("hides draft shops from other users but shows them to the owner", async () => {
    const { data: shop, error } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Draft shop",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    const shopId = shop!.id;

    const asOwner = await sellerClient.from("shops").select("id").eq("id", shopId).maybeSingle();
    expect(asOwner.data?.id).toBe(shopId);

    const asOther = await buyerClient.from("shops").select("id").eq("id", shopId).maybeSingle();
    expect(asOther.data).toBeNull();

    const asAnon = await anon.from("shops").select("id").eq("id", shopId).maybeSingle();
    expect(asAnon.data).toBeNull();
  });

  it("shows published public shops to anonymous visitors", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Public shop",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "scheduled",
      })
      .select("id")
      .single();

    const asAnon = await anon.from("shops").select("id").eq("id", shop!.id).maybeSingle();
    expect(asAnon.data?.id).toBe(shop!.id);
  });

  it("prevents a non-owner from adding products to someone else's shop", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Owned shop",
        start_at: pastIso(1),
        end_at: futureIso(2),
        visibility: "public",
        status: "open",
      })
      .select("id")
      .single();

    const { error } = await buyerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Hijack", price: 100 });
    expect(error).not.toBeNull();
  });

  it("blocks muted users from posting chat messages", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Live shop",
        start_at: pastIso(1),
        end_at: futureIso(2),
        visibility: "public",
        status: "open",
      })
      .select("id")
      .single();
    const shopId = shop!.id;

    const before = await buyerClient
      .from("chat_messages")
      .insert({ shop_id: shopId, user_id: buyerId, message: "hello" });
    expect(before.error).toBeNull();

    await sellerClient
      .from("shop_mutes")
      .insert({ shop_id: shopId, user_id: buyerId, muted_by: sellerId });

    const after = await buyerClient
      .from("chat_messages")
      .insert({ shop_id: shopId, user_id: buyerId, message: "again" });
    expect(after.error).not.toBeNull();
  });

  it("forbids rating an order that isn't completed", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Order shop",
        start_at: pastIso(1),
        end_at: futureIso(2),
        visibility: "public",
        status: "open",
      })
      .select("id")
      .single();
    const { data: product } = await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Thing", price: 500 })
      .select("id")
      .single();

    const { data: order } = await buyerClient
      .from("orders")
      .insert({
        buyer_id: buyerId,
        shop_id: shop!.id,
        product_id: product!.id,
        amount_paid: 500,
        status: "paid",
      })
      .select("id")
      .single();

    const { error } = await buyerClient.from("ratings").insert({
      rater_id: buyerId,
      seller_id: sellerId,
      order_id: order!.id,
      stars: 5,
    });
    expect(error).not.toBeNull();
  });
});
