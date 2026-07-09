/**
 * @param {import('@supabase/supabase-js').SupabaseClient} userClient
 * @param {string} shopId
 * @param {string} body
 */
export async function sendChat(userClient, shopId, body) {
  const userId = (await userClient.auth.getUser()).data.user?.id;
  if (!userId) return { ok: false, error: "not authenticated" };

  const { data, error } = await userClient
    .from("chat_messages")
    .insert({ shop_id: shopId, user_id: userId, message: body })
    .select("id")
    .single();

  return { ok: !error, error: error?.message ?? null, messageId: data?.id ?? null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} adminOrSeller
 * @param {string} shopId
 * @param {string} userId
 */
export async function muteUser(adminOrSeller, shopId, userId) {
  const muterId = (await adminOrSeller.auth.getUser()).data.user?.id;
  const { error } = await adminOrSeller.from("shop_mutes").insert({
    shop_id: shopId,
    user_id: userId,
    muted_by: muterId ?? userId,
  });
  return { ok: !error, error: error?.message ?? null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} mutedClient
 * @param {string} shopId
 */
export async function assertMutedCannotChat(mutedClient, shopId) {
  const result = await sendChat(mutedClient, shopId, "should be blocked");
  return {
    ok: !result.ok,
    detail: result.ok
      ? "muted user was able to post chat"
      : (result.error ?? "chat blocked as expected"),
  };
}
