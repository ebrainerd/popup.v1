import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Truck, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrders } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ConfirmReceiptButton } from "@/components/confirm-receipt-button";
import { RatingForm } from "@/components/rating-form";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/orders");

  const { checkout } = await searchParams;
  const orders = await getBuyerOrders(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your orders</h1>

      {checkout === "success" && (
        <div className="mb-6 flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-5" />
          Payment successful! Your order is confirmed.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Package className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">You haven&apos;t bought anything yet.</p>
          <Link href="/" className="mt-2 inline-block text-primary hover:underline">
            Explore open shops →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const canConfirm = order.status === "shipped" || order.status === "in_transit";
            const canRate =
              (order.status === "delivered" || order.status === "received") && !order.hasRating;
            return (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {order.product?.photo_url ? (
                      <Image
                        src={order.product.photo_url}
                        alt={order.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{order.product?.title ?? "Item"}</p>
                        {order.shop && (
                          <Link
                            href={`/shop/${order.shop.id}`}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            {order.shop.name}
                          </Link>
                        )}
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      {formatCurrency(order.amount_paid)}
                    </p>
                    {order.tracking_number && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Truck className="size-3.5" />
                        {order.carrier ? `${order.carrier} · ` : ""}
                        {order.tracking_number}
                      </p>
                    )}
                  </div>
                </div>

                {(canConfirm || canRate) && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {canConfirm && <ConfirmReceiptButton orderId={order.id} />}
                    {canRate && <RatingForm orderId={order.id} />}
                  </div>
                )}
                {order.hasRating && (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-success">
                    Thanks for rating this seller!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
