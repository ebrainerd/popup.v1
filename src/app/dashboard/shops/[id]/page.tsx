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
import { Countdown } from "@/components/countdown";
import { ShopForm } from "@/components/shop-form";
import { ProductManager } from "@/components/product-manager";
import { LiveControlsCard } from "@/components/live-controls-card";
import { PublishControls } from "@/components/publish-controls";
import { LaunchChecklist } from "@/components/launch-checklist";
import { PaymentsSetupBanner } from "@/components/payments-setup-banner";
import { SellerTermsBanner } from "@/components/seller-terms-banner";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DropReportCard } from "@/components/drop-report";
import { DraftShopTracker } from "@/components/draft-shop-tracker";
import { CreatedShopCleanup } from "@/components/created-shop-cleanup";
import { derivePublishedShopWindow } from "@/lib/utils";
import { effectiveStreamProvider, isNativeLiveEnabled } from "@/lib/live-stream";
import { arePayoutsConnected, isStripePaymentsRequired } from "@/lib/payments";
import { syncStripeStatus } from "@/app/dashboard/payouts/actions";

export const metadata: Metadata = { title: "Manage shop" };
export const dynamic = "force-dynamic";

function checklistDone(
  health: ReturnType<typeof computeDropHealth>,
  id: string,
): boolean {
  return health.items.find((item) => item.id === id)?.done ?? false;
}

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
  const stripeOnboarded = isStripePaymentsRequired()
    ? await syncStripeStatus()
    : profile.stripe_onboarded;
  const sellerProfile = { ...profile, stripe_onboarded: stripeOnboarded };
  const shop = await getOwnedShopWithProducts(id, profile.id);
  if (!shop) notFound();

  const window = derivePublishedShopWindow(shop);
  const isDraft = window.isDraft;
  const justCreated = created === "1";

  const [orders, reminderCount] = await Promise.all([
    getSellerOrders(shop.id),
    getDropReminderCount(shop.id),
  ]);

  const health = computeDropHealth(shop, sellerProfile, reminderCount);
  const payoutsConnected = arePayoutsConnected(sellerProfile);
  const paymentsRequired = isStripePaymentsRequired();
  const termsAccepted = Boolean(profile.seller_terms_accepted_at);
  const report = window.isEnded ? await getDropReport(shop.id, profile.id) : null;
  const streamProvider = effectiveStreamProvider(shop);
  const nativeLiveEnabled = isNativeLiveEnabled();

  const liveControlsEnded = window.isEnded || (isDraft && window.schedule === "ended");

  const detailsDone = checklistDone(health, "details");
  const productsDone = checklistDone(health, "products");
  const liveDone = checklistDone(health, "live");

  return (
    <div className="space-y-6">
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
            {isDraft && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/shop/${shop.id}`}>
                  <Eye className="size-4" />
                  Preview shop
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <LaunchChecklist
        health={health}
        shopId={shop.id}
        isDraft={isDraft}
        paymentsRequired={paymentsRequired}
        payoutsConnected={payoutsConnected}
      />

      {paymentsRequired && !payoutsConnected && <PaymentsSetupBanner shopId={shop.id} />}

      {!termsAccepted && <SellerTermsBanner />}

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
        isOpen={window.isOpen}
        isEnded={window.isEnded}
        productCount={shop.products.length}
        startAt={shop.start_at}
        endAt={shop.end_at}
        payoutsConnected={payoutsConnected}
        paymentsRequired={paymentsRequired}
        termsAccepted={termsAccepted}
      />

      <div className="space-y-4">
        <CollapsibleSection
          id="shop-details"
          title="Shop details"
          description="Name, schedule, and cover photo."
          defaultOpen={!detailsDone}
          complete={detailsDone}
        >
          <ShopForm shop={shop} />
        </CollapsibleSection>

        <CollapsibleSection
          id="products"
          title="Products"
          description={`${shop.products.length} product${shop.products.length === 1 ? "" : "s"} added.`}
          defaultOpen={!productsDone}
          complete={productsDone}
        >
          <ProductManager shopId={shop.id} products={shop.products} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Shop appearance"
          description="Theme, layout, and what buyers see on your drop page."
          defaultOpen={false}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/shops/${shop.id}/customize`}>
                <Palette className="size-4" />
                Customize
              </Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Open the theme editor to change colors, layout, and which sections buyers see on your
            drop page.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          id="live-controls"
          title="Live controls"
          description="Stream source, camera, and go live when your shop is open."
          defaultOpen={!liveDone && nativeLiveEnabled}
          complete={liveDone}
        >
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
        </CollapsibleSection>
      </div>

      {report && <DropReportCard report={report} shopId={shop.id} />}

      <CollapsibleSection
        title="Orders"
        description={
          orders.length === 0
            ? "No orders yet."
            : `${orders.length} order${orders.length === 1 ? "" : "s"}.`
        }
        defaultOpen={false}
      >
        <SellerOrdersTable orders={orders} />
      </CollapsibleSection>
    </div>
  );
}
