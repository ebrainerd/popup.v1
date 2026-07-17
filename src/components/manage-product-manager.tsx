"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, CloudUpload } from "lucide-react";
import { saveShopProducts } from "@/app/dashboard/actions";
import { WizardProductManager } from "@/components/wizard-product-manager";
import {
  productToWizardDraft,
  wizardProductToPayload,
  type WizardProductDraft,
} from "@/lib/shop-wizard";
import type { Product } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { SHOP_ENDED_EDIT_MESSAGE } from "@/lib/shop-edit-guard";

/**
 * Products editor for the manage page. Reuses the exact same editor as the
 * setup Studio (`WizardProductManager`) so sellers never learn two different
 * UIs, but persists each change to the database via `saveShopProducts` and
 * reconciles server IDs back into local state.
 */
export function ManageProductManager({
  shopId,
  products: initialProducts,
  readOnly = false,
}: {
  shopId: string;
  products: Product[];
  readOnly?: boolean;
}) {
  const [drafts, setDrafts] = useState<WizardProductDraft[]>(() =>
    initialProducts.map(productToWizardDraft),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const persist = useCallback(
    (next: WizardProductDraft[]) => {
      if (readOnly) return;
      setDrafts(next);
      setStatus("saving");
      setMessage(null);
      startTransition(async () => {
        const res = await saveShopProducts(
          shopId,
          next.map((p) => wizardProductToPayload(p)),
        );
        if (res.error && !res.products) {
          setStatus("error");
          setMessage(res.error);
          return;
        }
        // Reconcile DB rows (esp. new IDs) back into local state.
        if (Array.isArray(res.products)) {
          setDrafts((res.products as Product[]).map(productToWizardDraft));
        }
        setStatus("saved");
        setMessage(res.error ?? null);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setStatus("idle"), 2500);
      });
    },
    [shopId, readOnly],
  );

  return (
    <div className="space-y-3">
      {readOnly && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {SHOP_ENDED_EDIT_MESSAGE}
        </p>
      )}
      {!readOnly && (
        <div className="flex min-h-5 items-center justify-end text-xs">
        {status === "saving" && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CloudUpload className="size-3.5 animate-pulse" /> Saving…
          </span>
        )}
        {status === "saved" && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              message ? "text-highlight" : "text-muted-foreground",
            )}
          >
            <Check className="size-3.5 text-success" /> {message ?? "Saved"}
          </span>
        )}
        {status === "error" && <span className="text-live">{message ?? "Could not save."}</span>}
        </div>
      )}
      <fieldset disabled={readOnly} className={readOnly ? "pointer-events-none opacity-70" : undefined}>
        <WizardProductManager products={drafts} onProductsChange={persist} />
      </fieldset>
    </div>
  );
}
