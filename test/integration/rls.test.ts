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
    const { data: shop, error: shopErr } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Public shop",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    expect(shopErr).toBeNull();

    await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Preview item", price: 500 });

    await sellerClient
      .from("shops")
      .update({ status: "scheduled" })
      .eq("id", shop!.id);

    const asAnon = await anon.from("shops").select("id").eq("id", shop!.id).maybeSingle();
    expect(asAnon.data?.id).toBe(shop!.id);
  });

  it("rejects direct authenticated insert as non-draft", async () => {
    const { error } = await sellerClient.from("shops").insert({
      seller_id: sellerId,
      name: "Bad insert",
      start_at: futureIso(1),
      end_at: futureIso(3),
      visibility: "public",
      status: "scheduled",
    });
    expect(error).not.toBeNull();
  });

  it("rejects publishing a draft shop without products", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Empty publish",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();

    const { error } = await sellerClient
      .from("shops")
      .update({ status: "scheduled" })
      .eq("id", shop!.id);
    expect(error).not.toBeNull();
  });

  it("hides draft shop reminder counts from anonymous visitors", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Draft reminder shop",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();

    await sellerClient.from("drop_reminders").insert({
      shop_id: shop!.id,
      user_id: buyerId,
      email_enabled: true,
    });

    const { data: count } = await anon.rpc("drop_reminder_count", { target_shop: shop!.id });
    expect(Number(count)).toBe(0);

    const rows = await anon
      .from("drop_reminders")
      .select("id")
      .eq("shop_id", shop!.id);
    expect(rows.data ?? []).toHaveLength(0);
  });

  it("exposes aggregate reminder counts for published shops without leaking rows", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Reminder shop",
        start_at: futureIso(1),
        end_at: futureIso(3),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();

    await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Drop item", price: 500 });

    await sellerClient
      .from("shops")
      .update({ status: "scheduled" })
      .eq("id", shop!.id);

    // Reminders are self-managed ("Users manage own drop reminders"), so the
    // buyer creates their own row.
    await buyerClient.from("drop_reminders").insert({
      shop_id: shop!.id,
      user_id: buyerId,
      email_enabled: true,
    });

    const { data: count } = await anon.rpc("drop_reminder_count", { target_shop: shop!.id });
    expect(Number(count)).toBe(1);

    const rows = await anon
      .from("drop_reminders")
      .select("id")
      .eq("shop_id", shop!.id);
    expect(rows.data ?? []).toHaveLength(0);
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
        status: "draft",
      })
      .select("id")
      .single();

    await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Thing", price: 100 });

    await sellerClient.from("shops").update({ status: "open" }).eq("id", shop!.id);

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
        status: "draft",
      })
      .select("id")
      .single();
    const shopId = shop!.id;

    await sellerClient.from("products").insert({ shop_id: shopId, title: "Chat item", price: 100 });
    await sellerClient.from("shops").update({ status: "open" }).eq("id", shopId);

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
        status: "draft",
      })
      .select("id")
      .single();
    const { data: product } = await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Thing", price: 500 })
      .select("id")
      .single();

    await sellerClient.from("shops").update({ status: "open" }).eq("id", shop!.id);

    // Buyers can no longer insert orders directly (webhook/service_role only,
    // 0025_security_hardening.sql).
    const buyerInsert = await buyerClient
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
    expect(buyerInsert.error).not.toBeNull();

    const { data: order } = await admin
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

  it("scopes order messaging to the order's buyer and seller", async () => {
    const stranger = await makeUser();

    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Messaging shop",
        start_at: pastIso(1),
        end_at: futureIso(2),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    const { data: product } = await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Chatty item", price: 500 })
      .select("id")
      .single();
    await sellerClient.from("shops").update({ status: "open" }).eq("id", shop!.id);
    const { data: order } = await admin
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
    const orderId = order!.id;

    // Both parties can message; strangers and spoofed senders cannot.
    const buyerMsg = await buyerClient
      .from("order_messages")
      .insert({ order_id: orderId, sender_id: buyerId, body: "Where is my package?" });
    expect(buyerMsg.error).toBeNull();
    const sellerMsg = await sellerClient
      .from("order_messages")
      .insert({ order_id: orderId, sender_id: sellerId, body: "Shipping tomorrow!" });
    expect(sellerMsg.error).toBeNull();
    const strangerMsg = await stranger.client
      .from("order_messages")
      .insert({ order_id: orderId, sender_id: stranger.id, body: "let me in" });
    expect(strangerMsg.error).not.toBeNull();
    const spoofed = await buyerClient
      .from("order_messages")
      .insert({ order_id: orderId, sender_id: sellerId, body: "spoofed" });
    expect(spoofed.error).not.toBeNull();

    const strangerRead = await stranger.client
      .from("order_messages")
      .select("id")
      .eq("order_id", orderId);
    expect(strangerRead.data ?? []).toHaveLength(0);

    // One open help request per order; either party may escalate it.
    const help = await buyerClient.from("order_help_requests").insert({
      order_id: orderId,
      opened_by: buyerId,
      reason: "not_received",
      message: "It never arrived.",
    });
    expect(help.error).toBeNull();
    const secondOpen = await sellerClient.from("order_help_requests").insert({
      order_id: orderId,
      opened_by: sellerId,
      reason: "other",
      message: "duplicate open request",
    });
    expect(secondOpen.error?.code).toBe("23505");
    const escalate = await sellerClient
      .from("order_help_requests")
      .update({ escalated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("status", "open")
      .is("escalated_at", null)
      .select("id");
    expect(escalate.error).toBeNull();
    expect(escalate.data).toHaveLength(1);

    // Archive: both parties resolve; either can clear only their own row.
    const buyerResolve = await buyerClient
      .from("order_conversation_resolutions")
      .upsert({ order_id: orderId, user_id: buyerId });
    expect(buyerResolve.error).toBeNull();
    const strangerResolve = await stranger.client
      .from("order_conversation_resolutions")
      .insert({ order_id: orderId, user_id: stranger.id });
    expect(strangerResolve.error).not.toBeNull();
    const sellerResolve = await sellerClient
      .from("order_conversation_resolutions")
      .upsert({ order_id: orderId, user_id: sellerId });
    expect(sellerResolve.error).toBeNull();

    const crossDelete = await buyerClient
      .from("order_conversation_resolutions")
      .delete({ count: "exact" })
      .eq("order_id", orderId)
      .eq("user_id", sellerId);
    expect(crossDelete.count).toBe(0);
    const ownDelete = await sellerClient
      .from("order_conversation_resolutions")
      .delete({ count: "exact" })
      .eq("order_id", orderId)
      .eq("user_id", sellerId);
    expect(ownDelete.count).toBe(1);
  });

  it("blocks buyers from tampering with order amounts", async () => {
    const { data: shop } = await sellerClient
      .from("shops")
      .insert({
        seller_id: sellerId,
        name: "Tamper shop",
        start_at: pastIso(1),
        end_at: futureIso(2),
        visibility: "public",
        status: "draft",
      })
      .select("id")
      .single();
    const { data: product } = await sellerClient
      .from("products")
      .insert({ shop_id: shop!.id, title: "Widget", price: 500 })
      .select("id")
      .single();
    await sellerClient.from("shops").update({ status: "open" }).eq("id", shop!.id);
    const { data: order } = await admin
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

    // Money columns are not updatable by authenticated clients (column grant).
    const tamper = await buyerClient
      .from("orders")
      .update({ amount_paid: 1 })
      .eq("id", order!.id);
    expect(tamper.error).not.toBeNull();

    // Buyers may still confirm receipt of their own order.
    const confirm = await buyerClient
      .from("orders")
      .update({
        status: "received",
        received_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      })
      .eq("id", order!.id)
      .eq("buyer_id", buyerId);
    expect(confirm.error).toBeNull();
  });
});
