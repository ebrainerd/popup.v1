import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, PackageOpen } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getAllSellerOrders } from "@/lib/orders";
import { SellerOrdersTable } from "@/components/seller-orders-table";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

/**
 * Cross-shop sales management: everything the seller has sold, with items
 * that still need action (awaiting shipment) pinned up top.
 */
export default async function SalesPage() {
  const profile = (await getCurrentProfile())!;
  const orders = await getAllSellerOrders(profile.id);

  const needsShipping = orders.filter((o) => o.status === "paid");
  const grossSales = orders.reduce((sum, o) => sum + (o.amount_paid ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
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

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <PackageOpen className="size-5 text-primary" />
          Needs your attention
          {needsShipping.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {needsShipping.length}
            </span>
          )}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Paid orders waiting for you to ship. Add tracking and mark them shipped to keep buyers
          in the loop (funds release after shipping).
        </p>
        {needsShipping.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" />
            All caught up. Nothing waiting to ship.
          </p>
        ) : (
          <SellerOrdersTable orders={needsShipping} />
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">All sales</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every order across all of your shops, newest first.
        </p>
        <SellerOrdersTable orders={orders} />
      </section>
    </div>
  );
}
