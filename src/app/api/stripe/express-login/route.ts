import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Opens the seller's Stripe Express dashboard (balance, payouts, bank
 * details). Login links are single-use and short-lived, so we mint one on
 * demand and redirect.
 */
export async function GET() {
  const site = getSiteUrl();
  const fallback = `${site}/dashboard/payouts?error=express_login_failed`;

  const stripe = getStripe();
  if (!stripe) return NextResponse.redirect(fallback);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${site}/login?redirectTo=/dashboard/payouts`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.stripe_account_id) return NextResponse.redirect(fallback);

  try {
    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
    return NextResponse.redirect(link.url);
  } catch (err) {
    console.error("express-login failed", err);
    Sentry.captureException(err, { tags: { area: "stripe_express_login" } });
    return NextResponse.redirect(fallback);
  }
}
