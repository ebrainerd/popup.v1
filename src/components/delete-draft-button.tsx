"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDraftShop } from "@/app/dashboard/actions";
import { clearActiveDraftShop } from "@/components/continue-draft-shop";
import { clearWizardDraftStorage } from "@/lib/shop-wizard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteDraftButton({
  shopId,
  shopName,
  variant = "icon",
  redirectTo = "/dashboard",
}: {
  shopId: string;
  shopName?: string;
  variant?: "icon" | "outline";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    const label = shopName ? `"${shopName}"` : "this draft";
    if (!confirm(`Delete ${label}? This can't be undone.`)) return;

    setError(null);
    startTransition(async () => {
      const res = await deleteDraftShop(shopId);
      if (res.error) {
        setError(res.error);
        return;
      }

      clearWizardDraftStorage(shopId);
      clearActiveDraftShop();
      router.push(redirectTo);
      router.refresh();
    });
  }

  if (variant === "outline") {
    return (
      <div>
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={pending}
        >
          <Trash2 className="size-4" />
          {pending ? "Deleting…" : "Delete draft"}
        </Button>
        {error && <p className="mt-2 text-sm text-live">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive",
        pending && "opacity-50",
      )}
      aria-label="Delete draft"
      title={error ?? "Delete draft"}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
