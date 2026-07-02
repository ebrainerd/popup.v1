import { CreditCard } from "lucide-react";

/**
 * Shown while the payouts page blocks on the server-side Stripe status sync
 * (notably when Stripe redirects the seller back after onboarding). Without
 * this, the return from Stripe looks like a stalled blank page.
 */
export default function PayoutsLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="flex items-center gap-2 font-semibold">
          <CreditCard className="size-5 text-primary" /> Payouts
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirming your payout setup with Stripe…
        </p>
        <div className="mt-6 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
