import type { Metadata } from "next";
import { FreshShopWizard } from "@/components/fresh-shop-wizard";
import { ShopStudio } from "@/components/studio/shop-studio";
import { getCurrentProfile } from "@/lib/auth";
import { getSellerShops } from "@/lib/shops";
import { isMarketingDemoEnabled, marketingDemoDraft } from "@/lib/marketing-demo";

export const metadata: Metadata = { title: "Create shop" };
export const dynamic = "force-dynamic";

export default async function NewShopPage() {
  // First-time sellers (no shops yet, drafts included) get the guided tour.
  const profile = await getCurrentProfile();
  const shops = profile ? await getSellerShops(profile.id) : [];
  const marketingDemo = isMarketingDemoEnabled();

  return (
    <>
      {!marketingDemo && <FreshShopWizard />}
      <ShopStudio
        firstShop={!marketingDemo && shops.length === 0}
        initialDraft={marketingDemo ? marketingDemoDraft() : undefined}
      />
    </>
  );
}
