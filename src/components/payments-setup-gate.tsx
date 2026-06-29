import Link from "next/link";
import { CreditCard } from "lucide-react";
import { SetupPaymentsButton } from "@/components/setup-payments-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Blocks shop creation until Stripe Connect onboarding is complete. */
export function PaymentsSetupGate({
  paymentsReady,
  returnTo,
  children,
}: {
  paymentsReady: boolean;
  returnTo: string;
  children: React.ReactNode;
}) {
  if (paymentsReady) return <>{children}</>;

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Set up payments first
        </CardTitle>
        <CardDescription>
          Connect your payout account with Stripe before creating a shop. Buyers check out through
          PopUp, and funds are released to you after you ship.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <SetupPaymentsButton redirectTo={returnTo} />
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
