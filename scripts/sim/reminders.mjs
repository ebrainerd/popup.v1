const MAILPIT_URL = "http://127.0.0.1:54324/api/v1/messages";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} shopId
 */
export async function subscribeReminder(buyerClient, shopId) {
  const userId = (await buyerClient.auth.getUser()).data.user?.id;
  if (!userId) return { ok: false, error: "not authenticated" };

  const { data, error } = await buyerClient
    .from("drop_reminders")
    .insert({
      shop_id: shopId,
      user_id: userId,
      email_enabled: true,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message, reminderId: null };
  }
  return { ok: true, error: null, reminderId: data.id };
}

/**
 * @param {{ baseUrl: string; secret?: string }} opts
 */
export async function fireDropRemindersCron({ baseUrl, secret }) {
  const url = new URL("/api/cron/send-drop-reminders", baseUrl);
  if (secret) url.searchParams.set("secret", secret);

  const headers = {};
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    const res = await fetch(url.toString(), { method: "GET", headers });
    const body = await res.text();
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      /* non-json body */
    }
    return {
      ok: res.ok,
      status: res.status,
      body: json ?? body,
      skipped: false,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: null,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Optional Mailpit probe after reminder cron. */
export async function fetchMailpitMessages() {
  try {
    const res = await fetch(MAILPIT_URL);
    if (!res.ok) {
      return { available: false, count: 0, messages: [] };
    }
    const json = await res.json();
    const messages = Array.isArray(json?.messages) ? json.messages : [];
    return { available: true, count: messages.length, messages };
  } catch {
    return { available: false, count: 0, messages: [] };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} anon
 * @param {string} shopId
 */
export async function dropReminderCount(anon, shopId) {
  const { data, error } = await anon.rpc("drop_reminder_count", { target_shop: shopId });
  if (error) return { ok: false, count: null, error: error.message };
  return { ok: true, count: Number(data), error: null };
}
