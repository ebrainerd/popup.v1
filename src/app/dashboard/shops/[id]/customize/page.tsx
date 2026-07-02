import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { ShopCustomizeStudio } from "@/components/studio/shop-customize-studio";

export const metadata: Metadata = { title: "Customize shop appearance" };
export const dynamic = "force-dynamic";

export default async function ShopCustomizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = (await getCurrentProfile())!;
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  return <ShopCustomizeStudio shop={shop} products={shop.products} />;
}
