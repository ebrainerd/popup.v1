import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/database.types";

const LABELS: Record<OrderStatus, { label: string; variant: "default" | "accent" | "success" | "muted" | "live" }> = {
  paid: { label: "Paid", variant: "accent" },
  shipped: { label: "Shipped", variant: "default" },
  in_transit: { label: "In transit", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  received: { label: "Received", variant: "success" },
  refunded: { label: "Refunded", variant: "muted" },
  canceled: { label: "Canceled", variant: "muted" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = LABELS[status] ?? { label: status, variant: "muted" as const };
  return <Badge variant={variant}>{label}</Badge>;
}
