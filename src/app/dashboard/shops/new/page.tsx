import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopSetupWizard } from "@/components/shop-setup-wizard";
import { ShopTermsGate } from "@/components/shop-terms-gate";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Create shop" };

export default async function NewShopPage() {
  const profile = await getCurrentProfile();
  const termsAccepted = Boolean(profile?.seller_terms_accepted_at);

  return (
    <ShopTermsGate termsAccepted={termsAccepted}>
      <FreshShopWizard />
      <ShopSetupWizard />
    </ShopTermsGate>
  );
}
