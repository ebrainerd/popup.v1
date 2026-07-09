import { assertLocalOnly, CRON_SECRET, SELLER_PASSWORD, BUYER_PASSWORD } from "../config.mjs";
import { createAdmin, createAnon, signIn } from "../clients.mjs";
import { ensureUser, sellerEmail, buyerEmail } from "../users.mjs";
import { createShop, createBuyNowProduct, createAuctionProduct } from "../shops.mjs";
import { attachTestConnect } from "../connect.mjs";
import {
  draftHiddenFromBuyer,
  buyerCannotInsertOrder,
  mutedCannotChat,
  cannotRateUnpaid,
  stockNeverNegative,
} from "../assertions.mjs";
import {
  queueAndStart,
  placeBid,
  placeBidsConcurrent,
  finalize,
  waitForAuctionEnd,
  getAuctionRun,
} from "../auctions.mjs";
import {
  simulatePaidOrder,
  markShipped,
  confirmReceipt,
  submitRating,
  attemptDoubleDecrement,
} from "../orders.mjs";
import {
  subscribeReminder,
  fireDropRemindersCron,
  fetchMailpitMessages,
  dropReminderCount,
} from "../reminders.mjs";
import { sendChat, muteUser, assertMutedCannotChat } from "../chat.mjs";

const futureIso = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
const pastIso = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {number} n
 */
async function loadSeller(admin, n) {
  const email = sellerEmail(n);
  const { id } = await ensureUser({
    email,
    username: `seller${String(n).padStart(2, "0")}`,
    displayName: `Sim Seller ${n}`,
    isSeller: true,
  });
  const client = await signIn(email, SELLER_PASSWORD);
  return { id, email, client };
}

/**
 * @param {number} n
 */
async function loadBuyer(n) {
  const email = buyerEmail(n);
  const { id } = await ensureUser({
    email,
    username: `buyer${String(n).padStart(2, "0")}`,
    displayName: `Sim Buyer ${n}`,
    isSeller: false,
  });
  const client = await signIn(email, BUYER_PASSWORD);
  return { id, email, client };
}

/**
 * Phase 1 — correctness: RLS, auctions, orders, chat, reminders.
 * @param {{ report: import('../run.mjs').SimReport }} ctx
 */
export async function runPhase1({ report }) {
  assertLocalOnly();
  const siteUrl = process.env.SIM_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdmin();
  const anon = createAnon();

  report.section("setup users");
  const sellers = await Promise.all([loadSeller(1), loadSeller(2), loadSeller(3)]);
  const buyers = await Promise.all(Array.from({ length: 12 }, (_, i) => loadBuyer(i + 1)));

  const [sellerA, sellerB, sellerC] = sellers;

  report.section("stripe connect");
  for (const s of sellers) {
    const connect = await attachTestConnect(admin, s.id, process.env.STRIPE_SECRET_KEY);
    report.record(`connect:${s.id.slice(0, 8)}`, {
      ok: connect.mode !== "error",
      detail: connect.mode === "attached" ? connect.accountId : (connect.reason ?? connect.mode),
    });
  }

  report.section("seller A — open shop (buy-now + auction)");
  const shopA = await createShop(admin, sellerA.id, {
    name: "Seller A open",
    startAt: pastIso(1),
    endAt: futureIso(24),
    status: "open",
  });
  const buyNowAId = await createBuyNowProduct(admin, shopA, {
    title: "Buy now widget",
    price: 800,
    quantity: 3,
  });
  const auctionProductAId = await createAuctionProduct(admin, shopA, {
    title: "Auction lot",
    auction_starting_bid: 500,
    auction_min_increment: 50,
    auction_duration_seconds: 4,
  });

  report.section("seller B — scheduled shop + reminders");
  const shopB = await createShop(admin, sellerB.id, {
    name: "Seller B scheduled",
    startAt: futureIso(0.05),
    endAt: futureIso(24),
    status: "draft",
  });
  await createBuyNowProduct(admin, shopB, { title: "Drop item", price: 600 });
  const { error: schedErr } = await sellerB.client
    .from("shops")
    .update({ status: "scheduled" })
    .eq("id", shopB);
  if (schedErr) throw new Error(`schedule shop B: ${schedErr.message}`);

  const reminderBuyers = buyers.slice(0, 5);
  for (const b of reminderBuyers) {
    const sub = await subscribeReminder(b.client, shopB);
    report.record(`reminder subscribe ${b.id.slice(0, 8)}`, {
      ok: sub.ok,
      detail: sub.error ?? "subscribed",
    });
  }

  report.section("seller C — draft shop (RLS)");
  const shopC = await createShop(admin, sellerC.id, {
    name: "Seller C draft",
    startAt: futureIso(1),
    endAt: futureIso(24),
    status: "draft",
  });
  await createBuyNowProduct(admin, shopC, { title: "Hidden", price: 400 });

  report.section("RLS assertions");
  report.record(
    "draftHiddenFromBuyer",
    await draftHiddenFromBuyer(sellerC.client, buyers[0].client, anon, shopC),
  );
  report.record(
    "buyerCannotInsertOrder",
    await buyerCannotInsertOrder(buyers[0].client, buyers[0].id, shopA, buyNowAId),
  );
  report.record(
    "mutedCannotChat",
    await mutedCannotChat(sellerA.client, buyers[1].client, sellerA.id, buyers[1].id, shopA),
  );

  report.section("auction flow");
  const auctionId = await queueAndStart(sellerA.client, auctionProductAId);

  const sellerBid = await placeBid(sellerA.client, auctionId, 2000);
  report.record("seller cannot bid", {
    ok: !sellerBid.ok,
    detail: sellerBid.error ?? "unexpected success",
  });

  const bidResults = await placeBidsConcurrent(
    [
      { client: buyers[2].client, maxCents: 600 },
      { client: buyers[3].client, maxCents: 750 },
      { client: buyers[4].client, maxCents: 900 },
    ],
    auctionId,
  );
  report.record("concurrent bids", {
    ok: bidResults.every((r) => r.ok),
    detail: `${bidResults.filter((r) => r.ok).length}/${bidResults.length} succeeded`,
  });

  await waitForAuctionEnd(admin, auctionId, { timeoutMs: 15_000 });
  const fin = await finalize(buyers[0].client, auctionId);
  report.record("finalize auction", { ok: fin.ok, detail: fin.error ?? JSON.stringify(fin.data) });

  const runAfter = await getAuctionRun(admin, auctionId);
  const winnerId = runAfter?.current_winner_id;
  const winningBid = runAfter?.current_bid ?? 900;

  const auctionOrder = await simulatePaidOrder(admin, {
    buyerId: winnerId,
    shopId: shopA,
    productId: auctionProductAId,
    amountPaid: winningBid,
    shippingAmount: 0,
    auctionId,
  });
  report.record("simulatePaidOrder (auction)", {
    ok: auctionOrder.ok,
    detail: auctionOrder.error ?? `order ${auctionOrder.order?.id}`,
  });

  const winnerClient = buyers.find((b) => b.id === winnerId)?.client ?? buyers[2].client;
  if (auctionOrder.order) {
    const ship = await markShipped(sellerA.client, auctionOrder.order.id, "1Z999", "UPS");
    report.record("markShipped (auction)", {
      ok: ship.ok,
      detail: ship.note ?? ship.via ?? ship.error,
    });
    const confirm = await confirmReceipt(winnerClient, auctionOrder.order.id);
    report.record("confirmReceipt (auction)", { ok: confirm.ok, detail: confirm.error ?? "confirmed" });
    const rate = await submitRating(winnerClient, auctionOrder.order.id, 5, "Great auction");
    report.record("submitRating (auction)", { ok: rate.ok, detail: rate.error ?? "rated" });
  }

  report.section("buy-now flow");
  const buyNowOrder = await simulatePaidOrder(admin, {
    buyerId: buyers[5].id,
    shopId: shopA,
    productId: buyNowAId,
    amountPaid: 800,
    shippingAmount: 100,
  });
  report.record("simulatePaidOrder (buy-now)", {
    ok: buyNowOrder.ok,
    detail: buyNowOrder.error ?? `fee=${buyNowOrder.platformFee}`,
  });

  if (buyNowOrder.order) {
    const shipBn = await markShipped(sellerA.client, buyNowOrder.order.id, "TRACK123", "USPS");
    report.record("markShipped (buy-now)", { ok: shipBn.ok, detail: shipBn.note ?? shipBn.via });
    const confirmBn = await confirmReceipt(buyers[5].client, buyNowOrder.order.id);
    report.record("confirmReceipt (buy-now)", { ok: confirmBn.ok, detail: confirmBn.error ?? "ok" });
    const rateBn = await submitRating(buyers[5].client, buyNowOrder.order.id, 4, "Solid");
    report.record("submitRating (buy-now)", { ok: rateBn.ok, detail: rateBn.error ?? "ok" });
  }

  report.section("edge cases");
  const { data: unpaidRateOrder, error: unpaidRateErr } = await admin
    .from("orders")
    .insert({
      buyer_id: buyers[6].id,
      shop_id: shopA,
      product_id: buyNowAId,
      amount_paid: 500,
      platform_fee: 45,
      status: "paid",
    })
    .select("id")
    .single();
  if (!unpaidRateErr && unpaidRateOrder) {
    report.record(
      "cannotRateUnpaid",
      await cannotRateUnpaid(buyers[6].client, buyers[6].id, sellerA.id, unpaidRateOrder.id),
    );
  } else {
    report.record("cannotRateUnpaid", { ok: false, detail: unpaidRateErr?.message ?? "setup failed" });
  }

  await muteUser(sellerA.client, shopA, buyers[7].id);
  report.record("assertMutedCannotChat", await assertMutedCannotChat(buyers[7].client, shopA));

  const beforeChat = await sendChat(buyers[8].client, shopA, "visible");
  report.record("chat before mute (buyer 8)", { ok: beforeChat.ok, detail: beforeChat.error ?? "sent" });

  const doubleDec = await attemptDoubleDecrement(admin, buyNowAId);
  report.record("double decrement attempt", {
    ok: doubleDec.neverNegative,
    detail: `before=${doubleDec.stockBefore} after=${doubleDec.stockAfter} err=${doubleDec.error ?? "none"}`,
  });
  report.record("stockNeverNegative", await stockNeverNegative(admin, buyNowAId));

  report.section("reminders cron");
  const { error: openErr } = await sellerB.client
    .from("shops")
    .update({ start_at: pastIso(0.01), status: "open" })
    .eq("id", shopB);
  if (openErr) report.note(`shop B open patch: ${openErr.message}`);

  const cron = await fireDropRemindersCron({ baseUrl: siteUrl, secret: CRON_SECRET });
  if (cron.skipped || cron.status === 0) {
    report.skip("fireDropRemindersCron", cron.error ?? "Next server not reachable");
  } else {
    report.record("fireDropRemindersCron", {
      ok: cron.ok,
      detail: `HTTP ${cron.status} ${JSON.stringify(cron.body)}`,
    });
    const mailpit = await fetchMailpitMessages();
    if (mailpit.available) {
      report.note(`Mailpit messages: ${mailpit.count}`);
    }
  }

  const countRes = await dropReminderCount(anon, shopB);
  report.record("drop_reminder_count (published)", {
    ok: countRes.ok && (countRes.count ?? 0) >= 1,
    detail: countRes.error ?? `count=${countRes.count}`,
  });

  return { ok: report.getState().summary.fail === 0 };
}
