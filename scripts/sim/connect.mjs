/**
 * Attach a Stripe Express test account to a seller profile when sk_test is available.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} sellerId
 * @param {string} [stripeSecretKey]
 */
export async function attachTestConnect(admin, sellerId, stripeSecretKey) {
  const key = stripeSecretKey?.trim() ?? "";
  if (!key || !key.startsWith("sk_test")) {
    return { mode: "skipped", reason: "no sk_test STRIPE_SECRET_KEY", accountId: null };
  }

  const body = new URLSearchParams({ type: "express" });
  const res = await fetch("https://api.stripe.com/v1/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    return {
      mode: "error",
      reason: json?.error?.message ?? `Stripe HTTP ${res.status}`,
      accountId: null,
    };
  }

  const accountId = json.id;
  const { error } = await admin
    .from("profiles")
    .update({ stripe_account_id: accountId, stripe_onboarded: true })
    .eq("id", sellerId);

  if (error) {
    return { mode: "error", reason: error.message, accountId };
  }

  return { mode: "attached", accountId, reason: null };
}
