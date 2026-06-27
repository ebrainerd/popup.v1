import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Palette } from "lucide-react";
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
import { LiveControlsCard } from "@/components/live-controls-card";
import { PublishControls } from "@/components/publish-controls";
import { CopyLink } from "@/components/copy-link";
import { LaunchChecklist, DropHealthSummary } from "@/components/launch-checklist";
import { DropReportCard } from "@/components/drop-report";
import { DraftShopTracker } from "@/components/draft-shop-tracker";
import { CreatedShopCleanup } from "@/components/created-shop-cleanup";
import { derivePublishedShopWindow } from "@/lib/utils";
import { effectiveStreamProvider, isNativeLiveEnabled } from "@/lib/live-stream";

export const metadata: Metadata = { title: "Manage shop" };
export const dynamic = "force-dynamic";

export default async function ManageShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const profile = (await getCurrentProfile())!;
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  const window = derivePublishedShopWindow(shop);
  const isDraft = window.isDraft;
  const justCreated = created === "1";

  const [orders, reminderCount] = await Promise.all([
    getSellerOrders(shop.id),
    getDropReminderCount(shop.id),
  ]);

  const health = computeDropHealth(shop, profile, reminderCount);
  const report = window.isEnded ? await getDropReport(shop.id, profile.id) : null;
  const streamProvider = effectiveStreamProvider(shop);
  const nativeLiveEnabled = isNativeLiveEnabled();

  const liveControlsEnded = window.isEnded || (isDraft && window.schedule === "ended");

  return (
    <div className="space-y-8">
      <DraftShopTracker shopId={shop.id} isDraft={isDraft} />
      <CreatedShopCleanup created={justCreated} shopId={shop.id} />

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
            {isDraft ? (
              <Badge variant="muted">Draft</Badge>
            ) : window.isOpen ? (
              <Badge variant="success">Open</Badge>
            ) : window.isScheduled ? (
              <Badge variant="accent">Scheduled</Badge>
            ) : (
              <Badge variant="muted">Ended</Badge>
            )}
            {shop.is_live && window.isOpen && <Badge variant="live">LIVE</Badge>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Countdown
              startAt={shop.start_at}
              endAt={shop.end_at}
              draft={isDraft}
            />
            {isDraft && window.schedule === "open" && (
              <p className="text-xs text-muted-foreground">Publish to open for buyers</p>
            )}
            {isDraft && window.schedule === "scheduled" && (
              <p className="text-xs text-muted-foreground">Won&apos;t open until you publish</p>
            )}
            {isDraft ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/shop/${shop.id}`}>
                  <Eye className="size-4" />
                  Preview shop
                </Link>
              </Button>
            ) : (
              <CopyLink path={`/shop/${shop.id}`} label="Share shop link" />
            )}
          </div>
        </div>
      </div>

      {justCreated && isDraft && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium">Shop setup complete — review your drop below.</p>
          <p className="mt-1 text-muted-foreground">
            Preview your shop, publish when you&apos;re ready, or{" "}
            <Link href={`/dashboard/shops/${shop.id}/setup`} className="text-primary hover:underline">
              return to setup
            </Link>{" "}
            to make changes.
          </p>
        </div>
      )}

      {isDraft && !justCreated && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {window.schedule === "open"
              ? "Your scheduled window has started, but this drop is still a draft. Publish to open for buyers."
              : window.schedule === "ended"
                ? "Your planned window has ended. Update the schedule in Shop details below."
                : "This drop is still in setup. It won't open automatically — publish when you're ready."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/shops/${shop.id}/setup`}>Continue setup</Link>
          </Button>
        </div>
      )}

      <PublishControls
        shopId={shop.id}
        isDraft={isDraft}
        productCount={shop.products.length}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <LaunchChecklist health={health} shopId={shop.id} />
        <DropHealthSummary health={health} />
      </div>

      <Card id="shop-details">
        <CardHeader>
          <CardTitle>Shop details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Name, schedule, and cover photo. Stream source and camera test are in{" "}
            <a href="#live-controls" className="text-primary hover:underline">
              Live controls
            </a>{" "}
            below.
          </p>
        </CardHeader>
        <CardContent>
          <ShopForm shop={shop} />
        </CardContent>
      </Card>

      <Card id="products">
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductManager shopId={shop.id} products={shop.products} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" /> Shop appearance
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Theme, layout, and what buyers see on your drop page.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/shops/${shop.id}/customize`}>Customize appearance</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card id="live-controls">
        <CardHeader>
          <CardTitle>Live controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your stream source, test your camera, and go live when your shop is open.
          </p>
        </CardHeader>
        <CardContent>
          <LiveControlsCard
            shopId={shop.id}
            isLive={shop.is_live}
            isOpen={window.isOpen}
            isEnded={liveControlsEnded}
            streamProvider={streamProvider}
            liveUrl={shop.live_url}
            twitchUrl={shop.twitch_url}
            needsTosAcceptance={!shop.native_live_tos_accepted_at}
            nativeEnabled={nativeLiveEnabled}
          />
        </CardContent>
      </Card>

      {report && <DropReportCard report={report} shopId={shop.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <SellerOrdersTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}
