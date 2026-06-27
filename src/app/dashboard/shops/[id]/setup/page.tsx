import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { ShopSetupWizard } from "@/components/shop-setup-wizard";
import { shopToWizardDraft } from "@/lib/shop-wizard";

export const metadata: Metadata = { title: "Shop setup" };
export const dynamic = "force-dynamic";

export default async function ShopSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = (await getCurrentProfile())!;
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  if (shop.status !== "draft") {
    redirect(`/dashboard/shops/${id}`);
  }

  return <ShopSetupWizard shopId={id} initialDraft={shopToWizardDraft(shop, shop.products)} />;
}
