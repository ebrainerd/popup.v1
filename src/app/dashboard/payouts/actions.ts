"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";

function safeRedirectPath(input: FormDataEntryValue | null, fallback = "/dashboard/payouts"): string {
  const value = typeof input === "string" ? input : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

/** Create (if needed) the seller's Stripe Express account and start onboarding. */
export async function startStripeOnboarding(formData: FormData) {
  const stripe = getStripe();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const payoutsReturn = `/dashboard/payouts?status=return&redirectTo=${encodeURIComponent(redirectTo)}`;

  if (!stripe) redirect(`/dashboard/payouts?error=not_configured&redirectTo=${encodeURIComponent(redirectTo)}`);

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

  // Stripe API failures (e.g. Connect not enabled on the platform account, or a
  // transient outage) must not surface as an unhandled 500 — fail gracefully
  // back to the payouts page with an error the UI can explain.
  let onboardingUrl: string;
  try {
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
      refresh_url: `${getSiteUrl()}/dashboard/payouts?status=refresh&redirectTo=${encodeURIComponent(redirectTo)}`,
      return_url: `${getSiteUrl()}${payoutsReturn}`,
      type: "account_onboarding",
    });
    onboardingUrl = link.url;
  } catch (err) {
    console.error("startStripeOnboarding failed", err);
    Sentry.captureException(err, { tags: { area: "stripe_onboarding" } });
    redirect(`/dashboard/payouts?error=onboarding_failed&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(onboardingUrl);
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
      revalidatePath("/dashboard/shops/new");
    }
    return onboarded;
  } catch {
    return profile.stripe_onboarded;
  }
}
