import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { getSellerOrders } from "@/lib/orders";
import { SellerOrdersTable } from "@/components/seller-orders-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/countdown";
import { ShopForm } from "@/components/shop-form";
import { ProductManager } from "@/components/product-manager";
import { ShopQuickActions } from "@/components/shop-quick-actions";
import { PublishControls } from "@/components/publish-controls";
import { CopyLink } from "@/components/copy-link";
import { deriveShopStatus } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage shop" };
export const dynamic = "force-dynamic";

export default async function ManageShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = (await getCurrentProfile())!;
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const isOpen = status === "open";

  const orders = await getSellerOrders(shop.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            {shop.status === "draft" ? (
              <Badge variant="muted">Draft</Badge>
            ) : isOpen ? (
              <Badge variant="success">Open</Badge>
            ) : status === "scheduled" ? (
              <Badge variant="accent">Scheduled</Badge>
            ) : (
              <Badge variant="muted">Ended</Badge>
            )}
            {shop.is_live && isOpen && <Badge variant="live">LIVE</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Countdown startAt={shop.start_at} endAt={shop.end_at} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/shop/${shop.id}`}>
                <ExternalLink className="size-4" /> View
              </Link>
            </Button>
            <CopyLink path={`/shop/${shop.id}`} />
          </div>
        </div>
      </div>

      <PublishControls
        shopId={shop.id}
        isDraft={shop.status === "draft"}
        productCount={shop.products.length}
      />

      <Card>
        <CardHeader>
          <CardTitle>Live controls</CardTitle>
        </CardHeader>
        <CardContent>
          <ShopQuickActions
            shopId={shop.id}
            isLive={shop.is_live}
            isOpen={isOpen}
            hasLiveUrl={Boolean(shop.live_url)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductManager shopId={shop.id} products={shop.products} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <SellerOrdersTable orders={orders} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop details</CardTitle>
        </CardHeader>
        <CardContent>
          <ShopForm shop={shop} />
        </CardContent>
      </Card>
    </div>
  );
}
