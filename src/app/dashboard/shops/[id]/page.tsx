import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShoppingBag } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnedShopWithProducts } from "@/lib/shops";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/countdown";
import { ShopForm } from "@/components/shop-form";
import { ProductManager } from "@/components/product-manager";
import { ShopQuickActions } from "@/components/shop-quick-actions";
import { CopyLink } from "@/components/copy-link";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";

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

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, amount_paid, status, created_at, product_id")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

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
            {isOpen ? (
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
            {!orders || orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <ShoppingBag className="size-6" />
                <p className="text-sm">No orders yet. Sales appear here once checkout is live.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      #{o.id.slice(0, 8)}
                    </span>
                    <span>{formatCurrency(o.amount_paid)}</span>
                    <Badge variant="muted">{o.status}</Badge>
                  </div>
                ))}
              </div>
            )}
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
