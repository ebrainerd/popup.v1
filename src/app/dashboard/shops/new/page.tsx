import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopSetupWizard } from "@/components/shop-setup-wizard";
import { ContinueDraftShop } from "@/components/continue-draft-shop";

export const metadata: Metadata = { title: "Create shop" };

export default function NewShopPage() {
  return (
    <>
      <ContinueDraftShop />
      <FreshShopWizard />
      <ShopSetupWizard />
    </>
  );
}
