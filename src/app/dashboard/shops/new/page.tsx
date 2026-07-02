import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopStudio } from "@/components/studio/shop-studio";
import { getCurrentProfile } from "@/lib/auth";
import { getSellerShops } from "@/lib/shops";

export const metadata: Metadata = { title: "Create shop" };
export const dynamic = "force-dynamic";

export default async function NewShopPage() {
  // First-time sellers (no shops yet, drafts included) get the guided tour.
  const profile = await getCurrentProfile();
  const shops = profile ? await getSellerShops(profile.id) : [];

  return (
    <>
      <FreshShopWizard />
      <ShopStudio firstShop={shops.length === 0} />
    </>
  );
}
