"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";

/** Create (if needed) the seller's Stripe Express account and start onboarding. */
export async function startStripeOnboarding() {
  const stripe = getStripe();
  if (!stripe) redirect("/dashboard/payouts?error=not_configured");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/payouts");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_profile: { product_description: "Time-boxed pop-up shop on PopUp" },
    });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${getSiteUrl()}/dashboard/payouts?status=refresh`,
    return_url: `${getSiteUrl()}/dashboard/payouts?status=return`,
    type: "account_onboarding",
  });

  redirect(link.url);
}

/** Sync the local onboarding flag from Stripe (called on the payouts page). */
export async function syncStripeStatus(): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_onboarded")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_account_id) return false;

  try {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const onboarded = Boolean(account.charges_enabled && account.details_submitted);
    if (onboarded !== profile.stripe_onboarded) {
      await supabase.from("profiles").update({ stripe_onboarded: onboarded }).eq("id", user.id);
      revalidatePath("/dashboard", "layout");
    }
    return onboarded;
  } catch {
    return profile.stripe_onboarded;
  }
}
