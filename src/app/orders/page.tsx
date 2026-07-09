import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Package,
  Truck,
  CheckCircle2,
  PackageCheck,
  ExternalLink,
  Store,
  Check,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isInviteOnlyMode } from "@/lib/discovery";
import { getBuyerOrders, type BuyerOrder } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ConfirmReceiptButton } from "@/components/confirm-receipt-button";
import { RatingForm } from "@/components/rating-form";
import { CheckoutCelebration } from "@/components/checkout-celebration";
import { PostPurchaseCta } from "@/components/post-purchase-cta";
import { cn, formatCurrency, carrierTrackingUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/orders");

  const { checkout } = await searchParams;
  const orders = await getBuyerOrders(user.id);

  const sellerIds = [
    ...new Set(orders.map((o) => o.shop?.seller_id).filter((id): id is string => Boolean(id))),
  ];
  const followingSellerIds = new Set<string>();
  if (sellerIds.length > 0) {
    const supabase = await createClient();
    const { data: follows } = await supabase
      .from("shop_follows")
      .select("seller_id")
      .eq("follower_id", user.id)
      .in("seller_id", sellerIds);
    (follows ?? []).forEach((f) => followingSellerIds.add(f.seller_id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your orders</h1>

      {checkout === "success" && (
        <>
          <CheckoutCelebration />
          <PostPurchaseCta orders={orders} followingSellerIds={followingSellerIds} />
          <div className="mb-6 flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="size-5" />
            Payment successful! Your order is confirmed.
          </div>
        </>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Package className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">You haven&apos;t bought anything yet.</p>
          {isInviteOnlyMode() ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Open a creator&apos;s PopUp shop link to join their drop.
            </p>
          ) : (
            <Link href="/explore" className="mt-2 inline-block text-primary hover:underline">
              Explore open shops →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: BuyerOrder }) {
  const seller = order.shop?.seller;
  const sellerName = seller?.username ? `@${seller.username}` : "Seller";
  const trackingUrl = carrierTrackingUrl(order.carrier, order.tracking_number);
  const canConfirm = order.status === "shipped" || order.status === "in_transit";
  const canRate =
    (order.status === "delivered" || order.status === "received") && !order.hasRating;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {order.product?.photo_url ? (
            <Image src={order.product.photo_url} alt={order.product.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{order.product?.title ?? "Item"}</p>
            <OrderStatusBadge status={order.status} />
          </div>
          {order.shop && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <Link href={`/shop/${order.shop.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Store className="size-3.5" /> {order.shop.name}
              </Link>
              {seller && (
                <>
                  <span>·</span>
                  <Link href={`/u/${seller.username}`} className="hover:text-foreground">
                    @{seller.username}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isTerminalOrder(order) && <OrderTimeline order={order} />}

      {/* What's next */}
      <OrderStatusHint order={order} />

      {/* Details */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-3">
        <Detail label="Order #" value={`#${order.id.slice(0, 8)}`} mono />
        <Detail label="Ordered" value={formatDate(order.created_at) ?? "—"} />
        <Detail label="Total paid" value={formatCurrency(order.amount_paid)} />
        <Detail label="Seller" value={sellerName} />
        <Detail
          label="Shipping"
          value={order.shipping_amount > 0 ? formatCurrency(order.shipping_amount) : "Free"}
        />
        <Detail
          label="Carrier"
          value={order.carrier ? order.carrier : order.tracking_number ? "—" : "Not shipped yet"}
        />
      </dl>

      {order.tracking_number && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <Truck className="size-4 text-muted-foreground" />
          <span className="font-medium">Tracking:</span>
          <span className="font-mono">{order.tracking_number}</span>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Track package <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      {(canConfirm || canRate) && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          {canConfirm && <ConfirmReceiptButton orderId={order.id} />}
          {canRate && <RatingForm orderId={order.id} />}
        </div>
      )}
      {order.hasRating && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-success">
          <CheckCircle2 className="size-3.5" /> Thanks for rating this seller!
        </p>
      )}
    </div>
  );
}

function isTerminalOrder(order: BuyerOrder): boolean {
  return order.status === "refunded" || order.status === "canceled";
}

function OrderStatusHint({ order }: { order: BuyerOrder }) {
  const seller = order.shop?.seller;
  const sellerHref = seller ? `/u/${seller.username}` : null;

  switch (order.status) {
    case "paid":
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Payment confirmed. The seller is preparing your order — you&apos;ll see tracking here once
          it ships.
        </p>
      );
    case "shipped":
    case "in_transit":
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          {order.tracking_number
            ? "On its way! Use the tracking link below for the latest delivery estimate."
            : "Your order has shipped and is on its way."}
        </p>
      );
    case "delivered":
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Marked delivered. Confirm receipt to let the seller know it arrived.
        </p>
      );
    case "received":
      return (
        <p className="mt-3 text-sm text-muted-foreground">Order complete. Thanks for shopping!</p>
      );
    case "refunded":
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          This order was refunded. Your payment should return to your original method within a few
          business days.{" "}
          {sellerHref ? (
            <>
              Questions?{" "}
              <Link href={sellerHref} className="font-medium text-primary hover:underline">
                Contact the seller
              </Link>{" "}
              or{" "}
            </>
          ) : (
            "Questions? "
          )}
          <Link href="/support" className="font-medium text-primary hover:underline">
            reach PopUp support
          </Link>
          .
        </p>
      );
    case "canceled":
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          This order was canceled before payment completed — you were not charged.{" "}
          {sellerHref ? (
            <>
              Need help?{" "}
              <Link href={sellerHref} className="font-medium text-primary hover:underline">
                Contact the seller
              </Link>{" "}
              or{" "}
            </>
          ) : (
            "Need help? "
          )}
          <Link href="/support" className="font-medium text-primary hover:underline">
            PopUp support
          </Link>
          .
        </p>
      );
    default:
      return null;
  }
}

const STEPS = [
  { key: "ordered", label: "Ordered", icon: <CheckCircle2 className="size-4" /> },
  { key: "shipped", label: "Shipped", icon: <Truck className="size-4" /> },
  { key: "received", label: "Received", icon: <PackageCheck className="size-4" /> },
] as const;

function OrderTimeline({ order }: { order: BuyerOrder }) {
  // current step index reached
  const reached =
    order.status === "received" || order.status === "delivered"
      ? 2
      : order.status === "shipped" || order.status === "in_transit"
        ? 1
        : 0;
  const times = [order.created_at, order.shipped_at, order.received_at ?? order.delivered_at];

  return (
    <div className="mt-4 flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const time = times[i];
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border",
                  done
                    ? "border-transparent bg-success text-white"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : step.icon}
              </span>
              <span className={cn("mt-1 text-xs", done ? "font-medium" : "text-muted-foreground")}>
                {step.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {time ? new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1", i < reached ? "bg-success" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
