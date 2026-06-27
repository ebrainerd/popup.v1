import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopSetupWizard } from "@/components/shop-setup-wizard";

export const metadata: Metadata = { title: "Create shop" };

export default function NewShopPage() {
  return (
    <>
      <FreshShopWizard />
      <ShopSetupWizard />
    </>
  );
}
