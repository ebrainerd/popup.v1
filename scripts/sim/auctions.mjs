import { sleep } from "./config.mjs";

/**
 * Queue (or reuse) an auction run and start it when still queued.
 * @param {import('@supabase/supabase-js').SupabaseClient} sellerClient
 * @param {string} productId
 * @returns {Promise<string>} auction run id
 */
export async function queueAndStart(sellerClient, productId) {
  let auctionId;

  const { data, error } = await sellerClient.rpc("queue_auction_run", {
    p_product_id: productId,
  });

  if (error) {
    const alreadyQueued =
      /already queued|active/i.test(error.message) ||
      error.message.includes("auction already");
    if (!alreadyQueued) throw new Error(`queue_auction_run: ${error.message}`);

    const { data: run, error: fetchErr } = await sellerClient
      .from("auction_runs")
      .select("id, status")
      .eq("product_id", productId)
      .in("status", ["queued", "live", "awaiting_payment"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchErr || !run) {
      throw new Error(`queue_auction_run failed and no active run found: ${error.message}`);
    }
    auctionId = run.id;
    if (run.status === "queued") {
      const { error: startErr } = await sellerClient.rpc("start_auction_run", {
        p_auction_id: auctionId,
      });
      if (startErr) throw new Error(`start_auction_run: ${startErr.message}`);
    }
    return auctionId;
  }

  auctionId = data;
  const { error: startErr } = await sellerClient.rpc("start_auction_run", {
    p_auction_id: auctionId,
  });
  if (startErr) throw new Error(`start_auction_run: ${startErr.message}`);
  return auctionId;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} auctionId
 * @param {number} maxCents
 */
export async function placeBid(buyerClient, auctionId, maxCents) {
  const { data, error } = await buyerClient.rpc("place_auction_bid", {
    p_auction_id: auctionId,
    p_max_amount: maxCents,
  });
  if (error) {
    return { ok: false, error: error.message, data: null };
  }
  return { ok: true, error: null, data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} viewerClient
 * @param {string} auctionId
 */
export async function finalize(viewerClient, auctionId) {
  const { data, error } = await viewerClient.rpc("finalize_auction_run", {
    p_auction_id: auctionId,
  });
  if (error) {
    return { ok: false, error: error.message, data: null };
  }
  return { ok: true, error: null, data };
}

/**
 * @param {Array<{ client: import('@supabase/supabase-js').SupabaseClient; maxCents: number }>} bids
 * @param {string} auctionId
 */
export async function placeBidsConcurrent(bids, auctionId) {
  return Promise.all(
    bids.map(({ client, maxCents }) => placeBid(client, auctionId, maxCents)),
  );
}

/**
 * Poll until auction ends_at is in the past (or timeout).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} auctionId
 * @param {{ timeoutMs?: number; pollMs?: number }} [opts]
 */
export async function waitForAuctionEnd(client, auctionId, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const pollMs = opts.pollMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data: run } = await client
      .from("auction_runs")
      .select("ends_at, status")
      .eq("id", auctionId)
      .maybeSingle();
    if (run?.ends_at && new Date(run.ends_at).getTime() <= Date.now()) {
      return run;
    }
    if (run?.status !== "live") {
      return run;
    }
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for auction ${auctionId} to end`);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} auctionId
 */
export async function getAuctionRun(client, auctionId) {
  const { data, error } = await client
    .from("auction_runs")
    .select("*")
    .eq("id", auctionId)
    .maybeSingle();
  if (error) throw new Error(`getAuctionRun: ${error.message}`);
  return data;
}
