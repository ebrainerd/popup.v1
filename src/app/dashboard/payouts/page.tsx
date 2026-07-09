import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { syncStripeStatus } from "@/app/dashboard/payouts/actions";
import { SetupPaymentsButton } from "@/components/setup-payments-button";
import { StripeReturnReset } from "@/components/stripe-return-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

function stripeReturnCtaLabel(redirectTo: string | null): string {
  if (redirectTo?.startsWith("/dashboard/shops/")) return "Back to shop";
  return "Back to dashboard";
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; redirectTo?: string }>;
}) {
  const { status, error, redirectTo } = await searchParams;
  const safeRedirectTo =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null;
  const returnDestination = safeRedirectTo ?? "/dashboard";
  const returnCtaLabel = stripeReturnCtaLabel(safeRedirectTo);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  // Refresh onboarding status from Stripe when returning from the flow.
  const onboarded = stripeConfigured ? await syncStripeStatus() : false;
  const profile = await getCurrentProfile();

  if (onboarded && safeRedirectTo) {
    redirect(safeRedirectTo);
  }

  const isStripeReturn =
    stripeConfigured &&
    !onboarded &&
    (status === "return" || status === "refresh");

  return (
    <div className="mx-auto max-w-2xl">
      {isStripeReturn && <StripeReturnReset redirectTo={returnDestination} />}

      <Link
        href={returnDestination}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {returnCtaLabel}
      </Link>

      {isStripeReturn && (
        <div className="mb-4 space-y-4 rounded-xl border border-highlight/40 bg-highlight/10 px-4 py-4">
          <div>
            <p className="font-medium">Payout setup isn&apos;t finished</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "refresh"
                ? "Your Stripe link expired. You can finish connecting your bank anytime — other shop tasks still work."
                : "You left Stripe before finishing. You can connect payouts later — other shop tasks still work."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full rounded-full">
              <Link href={returnDestination}>{returnCtaLabel}</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You&apos;ll be redirected automatically in a few seconds, or tap the button above.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Payouts
          </CardTitle>
          <CardDescription>
            One-time setup for your seller account — applies to every shop you open. PopUp uses
            Stripe Connect to pay you after you ship (minus the 9% platform fee).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeConfigured ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Payments aren&apos;t configured on this deployment yet. Add your Stripe keys to
              enable checkout and payouts.
            </p>
          ) : onboarded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                Your payout account is connected and ready.
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  See your balance, upcoming bank payouts, and payment history in Stripe.
                </p>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a href="/api/stripe/express-login" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Open Stripe dashboard
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error === "not_configured" && (
                <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">
                  Stripe isn&apos;t configured on the server.
                </p>
              )}
              {error === "onboarding_failed" && (
                <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">
                  We couldn&apos;t start payout onboarding right now. Please try again in a
                  moment — if this keeps happening, contact support.
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    Payout account{" "}
                    <Badge variant="muted">
                      {profile?.stripe_account_id ? "Incomplete" : "Not started"}
                    </Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connect your bank details to start receiving payouts.
                  </p>
                </div>
                <SetupPaymentsButton
                  redirectTo={safeRedirectTo ?? "/dashboard/payouts"}
                  label={profile?.stripe_account_id ? "Finish setup" : "Set up payouts"}
                  className="w-full shrink-0 sm:w-auto"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
