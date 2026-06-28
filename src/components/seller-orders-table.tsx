"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Truck } from "lucide-react";
import { markShipped } from "@/app/orders/actions";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SellerOrder } from "@/lib/orders";
import { formatCurrency } from "@/lib/utils";

export function SellerOrdersTable({ orders }: { orders: SellerOrder[] }) {
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
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: SellerOrder }) {
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const buyerName = order.buyer?.username ? `@${order.buyer.username}` : "Buyer";
  const address = order.shipping_address as
    | { name?: string; address?: Record<string, string | null> }
    | null;
  const needsShipping = order.status === "paid";

  function ship() {
    setError(null);
    startTransition(async () => {
      const res = await markShipped(order.id, tracking, carrier);
      if (!res.ok) setError(res.error ?? "Could not mark shipped.");
    });
  }

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-medium">{order.product?.title ?? "Item"}</span>
        <span>{formatCurrency(order.amount_paid)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {buyerName}
        {address?.address?.city ? ` · ${address.address.city}, ${address.address.state ?? ""}` : ""}
      </p>

      {order.tracking_number && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="size-3.5" />
          {order.carrier ? `${order.carrier} · ` : ""}
          {order.tracking_number}
          {order.released_at && <span className="text-success"> · funds released</span>}
        </p>
      )}

      {needsShipping && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="flex-1">
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
      )}
      {error && <p className="mt-1 text-xs text-live">{error}</p>}
    </div>
  );
}
