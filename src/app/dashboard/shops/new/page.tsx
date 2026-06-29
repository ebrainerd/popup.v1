import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopSetupWizard } from "@/components/shop-setup-wizard";
import { ShopTermsGate } from "@/components/shop-terms-gate";
import { PaymentsSetupGate } from "@/components/payments-setup-gate";
import { getCurrentProfile } from "@/lib/auth";
import { arePayoutsConnected } from "@/lib/payments";
import { syncStripeStatus } from "@/app/dashboard/payouts/actions";

export const metadata: Metadata = { title: "Create shop" };

export default async function NewShopPage() {
  const profile = await getCurrentProfile();
  const termsAccepted = Boolean(profile?.seller_terms_accepted_at);
  const stripeOnboarded = profile ? await syncStripeStatus() : false;
  const paymentsReady = profile ? arePayoutsConnected({ stripe_onboarded: stripeOnboarded }) : false;

  return (
    <ShopTermsGate termsAccepted={termsAccepted}>
      <PaymentsSetupGate paymentsReady={paymentsReady} returnTo="/dashboard/shops/new">
        <FreshShopWizard />
        <ShopSetupWizard />
      </PaymentsSetupGate>
    </ShopTermsGate>
  );
}
