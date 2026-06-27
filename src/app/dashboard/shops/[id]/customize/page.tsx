import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { ShopThemeCustomizePanel } from "@/components/shop-theme-customize-panel";

export const metadata: Metadata = { title: "Customize shop appearance" };
export const dynamic = "force-dynamic";

export default async function ShopCustomizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = (await getCurrentProfile())!;
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/shops/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to manage shop
        </Link>
        <h1 className="text-2xl font-bold">Customize appearance</h1>
        <p className="mt-1 text-muted-foreground">
          Theme and layout for <span className="font-medium text-foreground">{shop.name}</span>. Buyers
          see this on your public shop page.
        </p>
      </div>

      <ShopThemeCustomizePanel shop={shop} products={shop.products} />
    </div>
  );
}
