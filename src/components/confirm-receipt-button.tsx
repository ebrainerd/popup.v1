"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { confirmReceipt } from "@/app/orders/actions";
import { Button } from "@/components/ui/button";

export function ConfirmReceiptButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await confirmReceipt(orderId);
          router.refresh();
        })
      }
    >
      <PackageCheck className="size-4" />
      {pending ? "Confirming…" : "Confirm receipt"}
    </Button>
  );
}
