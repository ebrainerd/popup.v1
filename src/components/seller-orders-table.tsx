"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ShoppingBag, Truck } from "lucide-react";
import { markShipped } from "@/app/orders/actions";
import { OrderMessagePanel } from "@/components/order-message-panel";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SellerOrder } from "@/lib/orders";
import { cn, formatCurrency } from "@/lib/utils";

type ShippingAddress = {
  name?: string;
  address?: Record<string, string | null>;
};

function formatShipToLines(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const a = raw as ShippingAddress & Record<string, unknown>;
  const addr = (a.address as Record<string, string | null>) ?? (a as Record<string, string | null>);
  const cityLine = [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ");
  return [a.name, addr.line1, addr.line2, cityLine, addr.country].filter(
    (line): line is string => typeof line === "string" && line.length > 0,
  );
}

export function SellerOrdersTable({
  orders,
  emphasizeShipping = false,
}: {
  orders: SellerOrder[];
  /** When true, paid rows show full ship-to address and a stronger ship CTA. */
  emphasizeShipping?: boolean;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <ShoppingBag className="size-6" />
        <p className="text-sm">No orders yet. Sales appear here once buyers check out.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} emphasizeShipping={emphasizeShipping} />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  emphasizeShipping,
}: {
  order: SellerOrder;
  emphasizeShipping: boolean;
}) {
  const router = useRouter();
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const buyerName = order.buyer?.username ? `@${order.buyer.username}` : "Buyer";
  const shipToLines = formatShipToLines(order.shipping_address);
  const needsShipping = order.status === "paid";
  const highlight = emphasizeShipping && needsShipping;

  function ship() {
    setError(null);
    startTransition(async () => {
      const res = await markShipped(order.id, tracking, carrier);
      if (!res.ok) {
        setError(res.error ?? "Could not mark shipped.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        highlight ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-medium">{order.product?.title ?? "Item"}</span>
        <span>{formatCurrency(order.amount_paid)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {order.shop?.name ? `${order.shop.name} · ` : ""}
        {buyerName}
        {!highlight && shipToLines.length > 0 && (
          <>
            {" · "}
            {shipToLines[shipToLines.length - 1]}
          </>
        )}
      </p>

      {highlight && shipToLines.length > 0 && (
        <div className="mt-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-xs">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="size-3.5 shrink-0" />
            Ship to
          </p>
          {shipToLines.map((line) => (
            <p key={line} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      )}

      {order.tracking_number && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="size-3.5" />
          {order.carrier ? `${order.carrier} · ` : ""}
          {order.tracking_number}
          {order.released_at && <span className="text-success"> · funds released</span>}
        </p>
      )}

      {needsShipping && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {highlight && (
            <p className="text-xs font-medium text-foreground">Add tracking to mark shipped</p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <Input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking number"
                className="h-9"
              />
            </div>
            <div className="w-28">
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Carrier"
                className="h-9"
              />
            </div>
            <Button size="sm" onClick={ship} disabled={pending || !tracking || !carrier}>
              <Truck className="size-4" /> Mark shipped
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-live">{error}</p>}

      {/* Order messages + "Need help with this order" */}
      <OrderMessagePanel orderId={order.id} counterpartName={buyerName} />
    </div>
  );
}
