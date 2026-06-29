import { CreditCard } from "lucide-react";
import { SetupPaymentsButton } from "@/components/setup-payments-button";

export function PaymentsSetupBanner({ shopId }: { shopId: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/40 bg-highlight/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 size-5 shrink-0 text-highlight" />
        <div>
          <p className="font-medium">Payments not set up yet</p>
          <p className="text-sm text-muted-foreground">
            Connect Stripe to receive payouts and publish this drop for buyers.
          </p>
        </div>
      </div>
      <SetupPaymentsButton
        redirectTo={`/dashboard/shops/${shopId}`}
        size="sm"
        className="shrink-0"
      />
    </div>
  );
}
