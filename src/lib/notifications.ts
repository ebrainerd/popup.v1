import "server-only";
import webpush from "web-push";
import * as Sentry from "@sentry/nextjs";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { carrierTrackingUrl } from "@/lib/utils";

let vapidConfigured: boolean | null = null;

/** Configure web-push VAPID details once; returns false if keys are missing. */
function ensureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@popup.app";
  if (!publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!ensureVapid() || userIds.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err: unknown) {
        // Clean up expired/invalid subscriptions.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );
  return sent;
}

/** Send one email via Resend. Returns false when skipped; throws on API failure. */
async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  const from = process.env.RESEND_FROM || "PopUp <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return true;
}

/** Resolve a user's email via the auth admin API (service role). */
async function emailForUser(userId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function sendEmailToUsers(userIds: string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || userIds.length === 0) return;
  const from = process.env.RESEND_FROM || "PopUp <onboarding@resend.dev>";
  const supabase = createServiceRoleClient();

  // Resolve emails via the auth admin API (service role).
  const emails: string[] = [];
  await Promise.allSettled(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data.user?.email) emails.push(data.user.email);
    }),
  );
  if (emails.length === 0) return;

  await Promise.allSettled(
    emails.map((to) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html }),
      }),
    ),
  );
}

/**
 * Notify a seller's followers that their shop just went live.
 * Fire-and-forget: never throws, and silently no-ops if notification
 * providers aren't configured.
 */
export async function notifyFollowersOfLive(shopId: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { data: shop } = await supabase
      .from("shops")
      .select("id, name, seller_id, seller:profiles!shops_seller_id_fkey(username, display_name)")
      .eq("id", shopId)
      .maybeSingle();
    if (!shop) return;

    const { data: followers } = await supabase
      .from("shop_follows")
      .select("follower_id")
      .eq("seller_id", shop.seller_id);
    const followerIds = (followers ?? []).map((f) => f.follower_id);
    if (followerIds.length === 0) return;

    const seller = (shop as unknown as {
      seller: { username: string; display_name: string | null } | null;
    }).seller;
    const sellerName = seller?.display_name || seller?.username || "A seller you follow";
    const url = `${getSiteUrl()}/shop/${shopId}`;

    await Promise.allSettled([
      sendPushToUsers(followerIds, {
        title: `${sellerName} is live! 🔴`,
        body: `${shop.name} is open and live right now. Jump in before it closes.`,
        url,
      }),
      sendEmailToUsers(
        followerIds,
        `${sellerName} is live on PopUp`,
        `<p><strong>${sellerName}</strong> just went live with <strong>${shop.name}</strong>.</p>
         <p><a href="${url}">Join the shop →</a></p>
         <p>Hurry — PopUp shops close on the clock.</p>`,
      ),
    ]);
  } catch (err) {
    console.error("notifyFollowersOfLive failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" }, extra: { shopId } });
  }
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Format a Stripe shipping/customer-details object into HTML address lines. */
function formatShippingAddress(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const addr = (a.address as Record<string, unknown>) ?? a;
  const name = typeof a.name === "string" ? a.name : null;
  const cityLine = [addr.city, addr.state, addr.postal_code]
    .filter((v) => typeof v === "string" && v)
    .join(", ");
  const lines = [name, addr.line1, addr.line2, cityLine, addr.country]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(escapeHtml);
  return lines.length > 0 ? lines.join("<br>") : null;
}

/**
 * Email both buyer and seller when an order is placed. Fire-and-forget:
 * never throws; no-ops if email isn't configured.
 */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const supabase = createServiceRoleClient();
    const { data: order } = await supabase
      .from("orders")
      .select(
        `id, buyer_id, amount_paid, shipping_amount, shipping_address, created_at,
         product:products!orders_product_id_fkey(title),
         shop:shops!orders_shop_id_fkey(id, name, seller_id)`,
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const o = order as unknown as {
      id: string;
      buyer_id: string;
      amount_paid: number;
      shipping_address: unknown;
      product: { title: string } | null;
      shop: { id: string; name: string; seller_id: string } | null;
    };
    const itemTitle = escapeHtml(o.product?.title ?? "your item");
    const shopName = escapeHtml(o.shop?.name ?? "a PopUp shop");
    const site = getSiteUrl();
    const shortId = o.id.slice(0, 8);
    const total = formatMoney(o.amount_paid);
    const addressHtml = formatShippingAddress(o.shipping_address);
    const shipToBlock = addressHtml
      ? `<p><strong>Ship to:</strong><br>${addressHtml}</p>`
      : `<p><em>No shipping address on file — check the order in your dashboard.</em></p>`;

    const [buyerEmail, sellerEmail] = await Promise.all([
      emailForUser(o.buyer_id),
      o.shop ? emailForUser(o.shop.seller_id) : Promise.resolve(null),
    ]);

    await Promise.allSettled([
      buyerEmail
        ? sendResendEmail(
            buyerEmail,
            `Order confirmed — ${itemTitle}`,
            `<h2>Thanks for your order! 🎉</h2>
             <p>You bought <strong>${itemTitle}</strong> from <strong>${shopName}</strong>.</p>
             <p><strong>Order #${shortId}</strong> · Total ${total}</p>
             ${shipToBlock}
             <p>Track its status anytime in <a href="${site}/orders">Your orders</a>. We'll email
             you again when it ships.</p>`,
          )
        : Promise.resolve(),
      sellerEmail && o.shop
        ? sendResendEmail(
            sellerEmail,
            `New sale — ${itemTitle}`,
            `<h2>You made a sale! 💸</h2>
             <p><strong>${itemTitle}</strong> sold for ${total}.</p>
             <p><strong>Order #${shortId}</strong></p>
             ${shipToBlock}
             <p>Pack it up and <a href="${site}/dashboard/shops/${o.shop.id}">mark it shipped with a
             tracking number</a> so your payout is released. Ship within 3 days to avoid a reminder.</p>`,
          )
        : Promise.resolve(),
    ]);
  } catch (err) {
    console.error("notifyOrderPlaced failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" }, extra: { orderId } });
  }
}

/** Email the buyer that their order shipped, with tracking. Best-effort. */
export async function notifyOrderShipped(orderId: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const supabase = createServiceRoleClient();
    const { data: order } = await supabase
      .from("orders")
      .select(
        `id, buyer_id, tracking_number, carrier,
         product:products!orders_product_id_fkey(title),
         shop:shops!orders_shop_id_fkey(name)`,
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const o = order as unknown as {
      id: string;
      buyer_id: string;
      tracking_number: string | null;
      carrier: string | null;
      product: { title: string } | null;
      shop: { name: string } | null;
    };

    const buyerEmail = await emailForUser(o.buyer_id);
    if (!buyerEmail) return;

    const itemTitle = escapeHtml(o.product?.title ?? "your item");
    const shopName = escapeHtml(o.shop?.name ?? "the shop");
    const trackUrl = carrierTrackingUrl(o.carrier, o.tracking_number);
    const carrier = o.carrier ? escapeHtml(o.carrier) : "";
    const tracking = o.tracking_number ? escapeHtml(o.tracking_number) : "";
    const site = getSiteUrl();

    const trackingBlock = tracking
      ? `<p><strong>Carrier:</strong> ${carrier || "—"}<br>
          <strong>Tracking #:</strong> ${tracking}
          ${trackUrl ? `<br><a href="${trackUrl}">Track your package →</a>` : ""}</p>`
      : "";

    await sendResendEmail(
      buyerEmail,
      `Your order shipped — ${itemTitle}`,
      `<h2>It's on its way! 📦</h2>
       <p><strong>${itemTitle}</strong> from <strong>${shopName}</strong> has shipped.</p>
       ${trackingBlock}
       <p>See full details in <a href="${site}/orders">Your orders</a>.</p>`,
    );
  } catch (err) {
    console.error("notifyOrderShipped failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" }, extra: { orderId } });
  }
}

/**
 * Nudge buyers to confirm receipt on shipped-but-unconfirmed orders. First
 * nudge ~3 days after shipping, a second ~4 days later (max 2). Runs from the
 * cron; returns the number of nudges sent.
 */
export async function nudgeAwaitingReceipt(): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;
  try {
    const supabase = createServiceRoleClient();
    const now = Date.now();
    const shippedCutoff = new Date(now - 3 * 24 * 3_600_000).toISOString();
    const nudgeCutoff = new Date(now - 4 * 24 * 3_600_000).toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select(
        `id, buyer_id, receipt_nudge_count,
         product:products!orders_product_id_fkey(title),
         shop:shops!orders_shop_id_fkey(name)`,
      )
      .is("received_at", null)
      .in("status", ["shipped", "in_transit", "delivered"])
      .lt("shipped_at", shippedCutoff)
      .lt("receipt_nudge_count", 2)
      .or(`receipt_nudge_at.is.null,receipt_nudge_at.lt.${nudgeCutoff}`);

    if (!orders || orders.length === 0) return 0;
    const site = getSiteUrl();
    let sent = 0;

    for (const row of orders) {
      const o = row as unknown as {
        id: string;
        buyer_id: string;
        receipt_nudge_count: number;
        product: { title: string } | null;
        shop: { name: string } | null;
      };
      const buyerEmail = await emailForUser(o.buyer_id);
      if (buyerEmail) {
        await sendResendEmail(
          buyerEmail,
          `Did your order arrive? — ${escapeHtml(o.product?.title ?? "your item")}`,
          `<h2>Did it arrive? 📬</h2>
           <p>Your order of <strong>${escapeHtml(o.product?.title ?? "your item")}</strong> from
           <strong>${escapeHtml(o.shop?.name ?? "the shop")}</strong> shipped a few days ago.</p>
           <p>If it's here, please <a href="${site}/orders">confirm you received it</a> — it lets the
           seller know it arrived and unlocks rating them. If it hasn't arrived, reach out to the seller.</p>`,
        );
        sent++;
      }
      await supabase
        .from("orders")
        .update({
          receipt_nudge_count: o.receipt_nudge_count + 1,
          receipt_nudge_at: new Date().toISOString(),
        })
        .eq("id", o.id);
    }
    return sent;
  } catch (err) {
    console.error("nudgeAwaitingReceipt failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" } });
    return 0;
  }
}

/**
 * Remind sellers about paid orders they haven't shipped within 3 days.
 * Funds stay withheld until an order ships, so this just nudges. Runs from the
 * cron; sends each reminder once. Returns the number of reminders sent.
 */
export async function remindUnshippedOrders(): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;
  try {
    const supabase = createServiceRoleClient();
    const cutoff = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString();
    const { data: orders } = await supabase
      .from("orders")
      .select(
        `id, shop_id, created_at,
         product:products!orders_product_id_fkey(title),
         shop:shops!orders_shop_id_fkey(id, name, seller_id)`,
      )
      .eq("status", "paid")
      .is("ship_reminder_sent_at", null)
      .lt("created_at", cutoff);

    if (!orders || orders.length === 0) return 0;
    const site = getSiteUrl();
    let sent = 0;

    for (const row of orders) {
      const o = row as unknown as {
        id: string;
        product: { title: string } | null;
        shop: { id: string; name: string; seller_id: string } | null;
      };
      if (!o.shop) continue;
      const sellerEmail = await emailForUser(o.shop.seller_id);
      if (sellerEmail) {
        await sendResendEmail(
          sellerEmail,
          `Reminder: ship your sale — ${escapeHtml(o.product?.title ?? "your item")}`,
          `<h2>Don't forget to ship! ⏰</h2>
           <p>Order <strong>#${o.id.slice(0, 8)}</strong> from <strong>${escapeHtml(o.shop.name)}</strong>
           has been paid for over 3 days and hasn't shipped yet.</p>
           <p><strong>Your payout stays on hold until you ship.</strong>
           <a href="${site}/dashboard/shops/${o.shop.id}">Mark it shipped with tracking →</a></p>`,
        );
        sent++;
      }
      await supabase
        .from("orders")
        .update({ ship_reminder_sent_at: new Date().toISOString() })
        .eq("id", o.id);
    }
    return sent;
  } catch (err) {
    console.error("remindUnshippedOrders failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" } });
    return 0;
  }
}

type DropReminderRow = {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  before_24h_sent_at: string | null;
  before_1h_sent_at: string | null;
  opening_sent_at: string | null;
  shop: {
    id: string;
    name: string;
    start_at: string;
    end_at: string;
    status: string;
    seller: { username: string; display_name: string | null } | null;
  } | null;
};

const REMINDER_COPY = {
  opening: {
    subject: (name: string) => `${name} is open now!`,
    pushTitle: (name: string) => `${name} just opened! 🔥`,
    pushBody: () => "The drop is live — jump in before items sell out.",
    html: (name: string, seller: string, url: string) =>
      `<p><strong>${name}</strong> by <strong>${seller}</strong> is open right now.</p>
       <p><a href="${url}">Join the drop →</a></p>`,
  },
  "1h": {
    subject: (name: string) => `${name} opens in 1 hour`,
    pushTitle: (name: string) => `${name} opens in 1 hour ⏰`,
    pushBody: () => "Get ready — the drop starts soon.",
    html: (name: string, seller: string, url: string, when: string) =>
      `<p><strong>${name}</strong> by <strong>${seller}</strong> opens in about an hour (${when}).</p>
       <p><a href="${url}">View the drop →</a></p>`,
  },
  "24h": {
    subject: (name: string) => `${name} opens tomorrow`,
    pushTitle: (name: string) => `${name} opens in 24 hours`,
    pushBody: () => "Mark your calendar — the drop is almost here.",
    html: (name: string, seller: string, url: string, when: string) =>
      `<p><strong>${name}</strong> by <strong>${seller}</strong> opens ${when}.</p>
       <p><a href="${url}">View the drop →</a></p>`,
  },
} as const;

/**
 * Send due drop reminders (24h, 1h, opening). Idempotent per window via delivery claims.
 * Returns count of reminders sent. Never throws.
 */
export async function sendDropReminders(): Promise<number> {
  try {
    const {
      dueReminderWindows,
    } = await import("@/lib/drop-reminders");
    const {
      canDeliverReminder,
      claimReminderDelivery,
      finalizeReminderDelivery,
      isEmailReminderDeliveryConfigured,
      resolveReminderDeliveryOutcome,
      userHasPushSubscription,
    } = await import("@/lib/reminder-delivery");
    const supabase = createServiceRoleClient();
    const now = new Date();

    const { data: rows } = await supabase
      .from("drop_reminders")
      .select(
        `id, user_id, email_enabled, push_enabled,
         before_24h_sent_at, before_1h_sent_at, opening_sent_at,
         shop:shops!drop_reminders_shop_id_fkey(id, name, start_at, end_at, status, seller:profiles!shops_seller_id_fkey(username, display_name))`,
      )
      .is("cancelled_at", null);

    if (!rows || rows.length === 0) return 0;

    const site = getSiteUrl();
    let sent = 0;

    for (const row of rows) {
      const r = row as unknown as DropReminderRow;
      const shop = r.shop;
      if (!shop || shop.status === "draft") continue;
      if (new Date(shop.end_at).getTime() < now.getTime()) continue;

      const windows = dueReminderWindows(shop.start_at, now, r);
      const window = windows.includes("opening")
        ? "opening"
        : windows.includes("1h")
          ? "1h"
          : windows[0];
      if (!window) continue;

      const claim = await claimReminderDelivery(r.id, window);
      if (claim !== "claimed") continue;

      const deliverable = await canDeliverReminder({
        userId: r.user_id,
        emailEnabled: r.email_enabled,
        pushEnabled: r.push_enabled,
      });

      if (!deliverable) {
        await finalizeReminderDelivery(r.id, window, "skipped_no_provider");
        continue;
      }

      const copy = REMINDER_COPY[window];
      const sellerName = shop.seller?.display_name || shop.seller?.username || "A creator";
      const url = `${site}/shop/${shop.id}`;
      const when = new Date(shop.start_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const emailWanted = r.email_enabled && isEmailReminderDeliveryConfigured();
      const pushWanted = r.push_enabled && (await userHasPushSubscription(r.user_id));

      let emailSucceeded = false;
      let pushSucceeded = false;
      let failureMessage: string | undefined;

      try {
        if (emailWanted) {
          const email = await emailForUser(r.user_id);
          if (email) {
            emailSucceeded = await sendResendEmail(
              email,
              copy.subject(shop.name),
              copy.html(escapeHtml(shop.name), escapeHtml(sellerName), url, when),
            );
          }
        }

        if (pushWanted) {
          const pushCount = await sendPushToUsers([r.user_id], {
            title: copy.pushTitle(shop.name),
            body: copy.pushBody(),
            url,
          });
          pushSucceeded = pushCount > 0;
        }
      } catch (err) {
        failureMessage = err instanceof Error ? err.message : String(err);
      }

      const outcome = failureMessage
        ? "failed"
        : resolveReminderDeliveryOutcome({
            emailWanted,
            pushWanted,
            emailSucceeded,
            pushSucceeded,
          });

      if (outcome !== "sent") {
        await finalizeReminderDelivery(r.id, window, outcome, { error: failureMessage });
        continue;
      }

      await finalizeReminderDelivery(r.id, window, "sent", { markReminderSent: true });
      sent++;
    }

    return sent;
  } catch (err) {
    console.error("sendDropReminders failed", err);
    Sentry.captureException(err, { tags: { area: "notifications" } });
    return 0;
  }
}
