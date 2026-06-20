import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { startStripeOnboarding, syncStripeStatus } from "@/app/dashboard/payouts/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  // Refresh onboarding status from Stripe when returning from the flow.
  const onboarded = stripeConfigured ? await syncStripeStatus() : false;
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Payouts
          </CardTitle>
          <CardDescription>
            PopUp uses Stripe Connect to pay you. Funds are released after you ship an order
            (held briefly to confirm it&apos;s on its way), minus the 9% platform fee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeConfigured ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Payments aren&apos;t configured on this deployment yet. Add your Stripe keys to
              enable checkout and payouts.
            </p>
          ) : onboarded ? (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              Your payout account is connected and ready.
            </div>
          ) : (
            <>
              {error === "not_configured" && (
                <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">
                  Stripe isn&apos;t configured on the server.
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
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
                <form action={startStripeOnboarding}>
                  <Button type="submit">
                    {profile?.stripe_account_id ? "Finish setup" : "Set up payouts"}
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
