"use client";

import { useState, useTransition } from "react";
import { Zap, Plus } from "lucide-react";
import { useShopRoom } from "@/components/shop-room";
import { setFlashDiscount, clearFlashDiscount, createFlashItem } from "@/app/shop/flash-actions";
import { ROOM_EVENTS } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import type { Product } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";

export function FlashControls({ products }: { products: Product[] }) {
  const { shopId, emit } = useShopRoom();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sellable = products.filter((p) => !p.is_flash_only);
  const [productId, setProductId] = useState(sellable[0]?.id ?? "");
  const [discount, setDiscount] = useState("");

  const [showItem, setShowItem] = useState(false);
  const [item, setItem] = useState({
    title: "",
    description: "",
    price: "",
    quantity: "1",
    photo_url: "",
  });

  function applyDiscount() {
    setError(null);
    const value = parseFloat(discount);
    if (!productId || Number.isNaN(value)) {
      setError("Pick a product and a discount price.");
      return;
    }
    startTransition(async () => {
      const res = await setFlashDiscount(productId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      emit(ROOM_EVENTS.flashPrice, { productId: res.productId, discountPrice: res.discountPrice });
      setDiscount("");
    });
  }

  function clearDiscount(id: string) {
    startTransition(async () => {
      const res = await clearFlashDiscount(id);
      if (res.ok) emit(ROOM_EVENTS.flashClear, { productId: id });
    });
  }

  function addFlashItem() {
    setError(null);
    startTransition(async () => {
      const res = await createFlashItem(shopId, {
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 0,
        photo_url: item.photo_url,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      emit(ROOM_EVENTS.flashItem, res.product);
      setItem({ title: "", description: "", price: "", quantity: "1", photo_url: "" });
      setShowItem(false);
    });
  }

  const activeDiscounts = products.filter(
    (p) => p.discount_price != null && p.discount_price < p.price,
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="size-5 text-primary" />
        <h3 className="font-semibold text-foreground">Flash drops</h3>
        <span className="text-xs text-muted-foreground">Broadcasts instantly to all viewers</span>
      </div>

      {/* Discount an existing product */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <Label className="text-xs">Product</Label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {sellable.length === 0 && <option value="">No products</option>}
            {sellable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({formatCurrency(p.price)})
              </option>
            ))}
          </select>
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-xs">Flash price</Label>
          <Input
            type="number"
            min={0.5}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="9.99"
          />
        </div>
        <Button onClick={applyDiscount} disabled={pending || !productId}>
          Apply deal
        </Button>
      </div>

      {activeDiscounts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeDiscounts.map((p) => (
            <button
              key={p.id}
              onClick={() => clearDiscount(p.id)}
              disabled={pending}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
            >
              Clear deal on {p.title} ✕
            </button>
          ))}
        </div>
      )}

      {/* Create a flash-only item */}
      <div className="mt-4 border-t border-border pt-3">
        {!showItem ? (
          <Button variant="outline" size="sm" onClick={() => setShowItem(true)}>
            <Plus className="size-4" /> New flash item
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Photo</Label>
              <ImageUpload
                name="flash_photo"
                bucket="products"
                aspect="square"
                label="Upload or drag a photo"
                onChange={(u) => setItem((it) => ({ ...it, photo_url: u }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={item.title}
                onChange={(e) => setItem({ ...item, title: e.target.value })}
                placeholder="Surprise mystery box"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={item.description}
                onChange={(e) => setItem({ ...item, description: e.target.value })}
                placeholder="What makes this flash item special?"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="w-28 space-y-1">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  min={0.5}
                  step="0.01"
                  value={item.price}
                  onChange={(e) => setItem({ ...item, price: e.target.value })}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => setItem({ ...item, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addFlashItem} disabled={pending || !item.title}>
                Drop it
              </Button>
              <Button variant="ghost" onClick={() => setShowItem(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-live">{error}</p>}
    </div>
  );
}
