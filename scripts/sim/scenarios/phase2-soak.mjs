import { assertLocalOnly, SELLER_PASSWORD, BUYER_PASSWORD } from "../config.mjs";
import { createAdmin, signIn } from "../clients.mjs";
import { ensureUser, sellerEmail, buyerEmail } from "../users.mjs";
import { createShop, createAuctionProduct } from "../shops.mjs";
import {
  queueAndStart,
  placeBidsConcurrent,
  waitForAuctionEnd,
  finalize,
  getAuctionRun,
} from "../auctions.mjs";
import { stockNeverNegative } from "../assertions.mjs";

/**
 * @param {number} n
 */
async function loadBuyer(n) {
  const email = buyerEmail(n);
  const { id } = await ensureUser({
    email,
    username: `soak_buyer${String(n).padStart(2, "0")}`,
    displayName: `Soak Buyer ${n}`,
    isSeller: false,
  });
  const client = await signIn(email, BUYER_PASSWORD);
  return { id, email, client };
}

/**
 * Phase 2 — soak: concurrent bidding on a 120s auction, timing + invariants.
 * @param {{ report: import('../run.mjs').SimReport }} ctx
 */
export async function runPhase2({ report }) {
  assertLocalOnly();
  const admin = createAdmin();
  const started = Date.now();

  report.section("setup hot shop");
  const sellerEmailAddr = sellerEmail(1);
  const { id: sellerId } = await ensureUser({
    email: sellerEmailAddr,
    username: "soak_seller01",
    displayName: "Soak Seller",
    isSeller: true,
  });
  const sellerClient = await signIn(sellerEmailAddr, SELLER_PASSWORD);

  const buyers = await Promise.all(Array.from({ length: 20 }, (_, i) => loadBuyer(i + 1)));

  const shopId = await createShop(admin, sellerId, {
    name: "Soak shop",
    startAt: new Date(Date.now() - 3_600_000).toISOString(),
    endAt: new Date(Date.now() + 86_400_000).toISOString(),
    status: "open",
  });
  const auctionProductId = await createAuctionProduct(admin, shopId, {
    title: "Soak lot",
    auction_starting_bid: 500,
    auction_min_increment: 25,
    auction_duration_seconds: 120,
  });

  report.section("start auction");
  const auctionStart = Date.now();
  const auctionId = await queueAndStart(sellerClient, auctionProductId);
  report.note(`Auction ${auctionId} started (120s duration)`);

  report.section("concurrent bids");
  const bidStarted = Date.now();
  const maxBids = buyers.map((b, i) => ({
    client: b.client,
    maxCents: 600 + i * 50,
  }));
  const bidResults = await placeBidsConcurrent(maxBids, auctionId);
  const bidElapsed = Date.now() - bidStarted;

  const succeeded = bidResults.filter((r) => r.ok).length;
  const failed = bidResults.filter((r) => !r.ok);
  report.record("20 concurrent max bids", {
    ok: succeeded >= 15,
    detail: `${succeeded}/20 in ${bidElapsed}ms`,
    data: { failed: failed.slice(0, 3).map((f) => f.error) },
  });

  report.section("wait and finalize");
  const waitStarted = Date.now();
  await waitForAuctionEnd(admin, auctionId, { timeoutMs: 130_000, pollMs: 1000 });
  const waitElapsed = Date.now() - waitStarted;
  report.note(`Waited ${waitElapsed}ms for auction end`);

  const finStarted = Date.now();
  const fin = await finalize(buyers[0].client, auctionId);
  const finElapsed = Date.now() - finStarted;
  report.record("finalize", {
    ok: fin.ok,
    detail: fin.error ?? `done in ${finElapsed}ms`,
    data: fin.data,
  });

  const run = await getAuctionRun(admin, auctionId);
  report.record("single winner", {
    ok: Boolean(run?.current_winner_id) && (run?.bid_count ?? 0) > 0,
    detail: `winner=${run?.current_winner_id?.slice(0, 8) ?? "none"} bids=${run?.bid_count} bid=${run?.current_bid}`,
  });

  report.record("stockNeverNegative", await stockNeverNegative(admin, auctionProductId));

  const { data: product } = await admin
    .from("products")
    .select("quantity")
    .eq("id", auctionProductId)
    .maybeSingle();
  report.record("auction product quantity invariant", {
    ok: (product?.quantity ?? 0) >= 0 && product?.quantity === 1,
    detail: `quantity=${product?.quantity}`,
  });

  const totalElapsed = Date.now() - started;
  report.note(`Phase 2 total elapsed: ${totalElapsed}ms (auction start offset ${auctionStart - started}ms)`);

  return { ok: report.getState().summary.fail === 0 };
}
