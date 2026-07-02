import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopStudio } from "@/components/studio/shop-studio";

export const metadata: Metadata = { title: "Create shop" };

export default async function NewShopPage() {
  return (
    <>
      <FreshShopWizard />
      <ShopStudio />
    </>
  );
}
