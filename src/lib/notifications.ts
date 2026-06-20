import "server-only";
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

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

async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!ensureVapid() || userIds.length === 0) return;
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err: unknown) {
        // Clean up expired/invalid subscriptions.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );
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
  }
}
