import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, PackageOpen, ShoppingBag } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { filterUnshippedSellerOrders, getAllSellerOrders } from "@/lib/orders";
import { SellerOrdersTable } from "@/components/seller-orders-table";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

type SalesView = "ship" | "all";

/**
 * Cross-shop sales management: unshipped (paid) orders get a dedicated tab;
 * all sales remain one click away.
 */
export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = (await getCurrentProfile())!;
  const { view: viewParam } = await searchParams;
  const view: SalesView = viewParam === "all" ? "all" : "ship";

  const orders = await getAllSellerOrders(profile.id);
  const needsShipping = filterUnshippedSellerOrders(orders);
  const grossSales = orders.reduce((sum, o) => sum + (o.amount_paid ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="mt-1 text-muted-foreground">
          {orders.length === 0
            ? "Sales from all your shops will appear here."
            : `${orders.length} sale${orders.length === 1 ? "" : "s"} across your shops · ${formatCurrency(grossSales)} gross`}
        </p>
      </div>

      <nav
        className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1"
        aria-label="Sales views"
      >
        <Link
          href="/dashboard/sales"
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            view === "ship"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={view === "ship" ? "page" : undefined}
        >
          <PackageOpen className="size-4 shrink-0" />
          To ship
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold leading-none",
              needsShipping.length > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {needsShipping.length}
          </span>
        </Link>
        <Link
          href="/dashboard/sales?view=all"
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            view === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={view === "all" ? "page" : undefined}
        >
          <ShoppingBag className="size-4 shrink-0" />
          All sales
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold leading-none text-muted-foreground">
            {orders.length}
          </span>
        </Link>
      </nav>

      {view === "ship" ? (
        <section>
          <h2 className="text-lg font-bold">
            {needsShipping.length === 0
              ? "Nothing to ship"
              : `${needsShipping.length} order${needsShipping.length === 1 ? "" : "s"} ready to ship`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid orders waiting for tracking. Mark them shipped to notify buyers and release
            funds after the payout hold.
          </p>
          <div className="mt-4">
            {needsShipping.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-10 text-center">
                <CheckCircle2 className="size-8 text-success" />
                <p className="font-medium">All caught up</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  No paid orders are waiting for shipment. New sales will show up here after
                  checkout.
                </p>
                {orders.length > 0 && (
                  <Button asChild variant="outline" size="sm" className="mt-2 rounded-full">
                    <Link href="/dashboard/sales?view=all">View all sales</Link>
                  </Button>
                )}
              </div>
            ) : (
              <SellerOrdersTable orders={needsShipping} emphasizeShipping />
            )}
          </div>
        </section>
      ) : (
        <section>
          {needsShipping.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-sm">
                <span className="font-medium">
                  {needsShipping.length} order{needsShipping.length === 1 ? "" : "s"} still need
                  shipping.
                </span>{" "}
                <span className="text-muted-foreground">Switch to To ship to fulfill them.</span>
              </p>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/dashboard/sales">
                  <PackageOpen className="size-4" /> To ship ({needsShipping.length})
                </Link>
              </Button>
            </div>
          )}
          <h2 className="text-lg font-bold">All sales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every order across all of your shops, newest first.
          </p>
          <div className="mt-4">
            <SellerOrdersTable orders={orders} />
          </div>
        </section>
      )}
    </div>
  );
}
