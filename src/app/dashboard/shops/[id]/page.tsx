import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { getSellerOrders } from "@/lib/orders";
import { getDropReminderCount } from "@/lib/drop-reminders";
import { computeDropHealth } from "@/lib/drop-readiness";
import { getDropReport } from "@/lib/drop-analytics";
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
import { LaunchChecklist, DropHealthSummary } from "@/components/launch-checklist";
import { DropReportCard } from "@/components/drop-report";
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
  const isEnded = status === "ended";

  const [orders, reminderCount] = await Promise.all([
    getSellerOrders(shop.id),
    getDropReminderCount(shop.id),
  ]);

  const health = computeDropHealth(shop, profile, reminderCount);
  const report = isEnded ? await getDropReport(shop.id, profile.id) : null;

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
                <ExternalLink className="size-4" /> Preview public drop
              </Link>
            </Button>
            <CopyLink path={`/shop/${shop.id}`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LaunchChecklist health={health} shopId={shop.id} />
        <DropHealthSummary health={health} />
      </div>

      {report && <DropReportCard report={report} shopId={shop.id} />}

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
            isEnded={isEnded}
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
