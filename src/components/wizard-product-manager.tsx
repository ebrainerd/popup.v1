"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Package, Pencil, Plus, Trash2 } from "lucide-react";
import type { WizardProductDraft } from "@/lib/shop-wizard";
import { duplicateWizardProduct, newWizardProduct } from "@/lib/shop-wizard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiImageUpload } from "@/components/multi-image-upload";
import {
  AuctionFields,
  SaleTypePicker,
} from "@/components/auction-product-fields";
import { formatCurrency } from "@/lib/utils";

export function WizardProductManager({
  products,
  onProductsChange,
}: {
  products: WizardProductDraft[];
  onProductsChange: (products: WizardProductDraft[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(
    products.length === 0 ? "new" : null,
  );
  const [draft, setDraft] = useState<WizardProductDraft>(
    products[0] ?? newWizardProduct(),
  );

  function startNew() {
    setDraft(newWizardProduct());
    setEditingId("new");
  }

  function startEdit(product: WizardProductDraft) {
    setDraft({ ...product, auctionFields: { ...product.auctionFields } });
    setEditingId(product.clientId);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(newWizardProduct());
  }

  function saveProduct() {
    if (!draft.title.trim()) return;
    if (editingId === "new") {
      onProductsChange([...products, draft]);
    } else {
      onProductsChange(
        products.map((p) => (p.clientId === draft.clientId ? draft : p)),
      );
    }
    setEditingId(null);
    setDraft(newWizardProduct());
  }

  function removeProduct(clientId: string) {
    onProductsChange(products.filter((p) => p.clientId !== clientId));
    if (editingId === clientId) cancelEdit();
  }

  function duplicateProduct(clientId: string) {
    const index = products.findIndex((p) => p.clientId === clientId);
    if (index === -1) return;
    const clone = duplicateWizardProduct(products[index]);
    onProductsChange([
      ...products.slice(0, index + 1),
      clone,
      ...products.slice(index + 1),
    ]);
    startEdit(clone);
  }

  function patchDraft(partial: Partial<WizardProductDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No products yet. Add your first item below.
          </p>
        ) : (
          products.map((product) =>
            editingId === product.clientId ? null : (
              <ProductRow
                key={product.clientId}
                product={product}
                onEdit={() => startEdit(product)}
                onDuplicate={() => duplicateProduct(product.clientId)}
                onDelete={() => {
                  if (confirm(`Delete "${product.title}"?`)) removeProduct(product.clientId);
                }}
              />
            ),
          )
        )}
      </div>

      {editingId === null && (
        <Button type="button" variant="outline" onClick={startNew}>
          <Plus className="size-4" /> Add product
        </Button>
      )}

      {editingId !== null && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="font-semibold">{editingId === "new" ? "New product" : "Edit product"}</h3>

          <SaleTypePicker
            value={draft.auctionFields.saleType}
            onChange={(saleType) =>
              patchDraft({
                auctionFields: {
                  ...draft.auctionFields,
                  saleType,
                  ...(saleType === "auction" ? { startingBid: draft.price || draft.auctionFields.startingBid } : {}),
                },
              })
            }
          />

          <AuctionFields
            state={draft.auctionFields}
            onChange={(partial) =>
              patchDraft({ auctionFields: { ...draft.auctionFields, ...partial } })
            }
          />

          <div className="space-y-2">
            <Label>Photos</Label>
            <MultiImageUpload
              bucket="products"
              defaultValue={draft.photo_urls}
              onChange={(urls) => patchDraft({ photo_urls: urls })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product_title">Title</Label>
            <Input
              id="product_title"
              maxLength={140}
              placeholder="Hand-printed tote bag"
              value={draft.title}
              onChange={(e) => patchDraft({ title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product_description">Description</Label>
            <Textarea
              id="product_description"
              rows={3}
              placeholder="Material, size, details…"
              value={draft.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {draft.auctionFields.saleType === "buy_now" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="product_price">Price (USD)</Label>
                  <Input
                    id="product_price"
                    type="number"
                    min={0.5}
                    step="0.01"
                    placeholder="24.00"
                    value={draft.price}
                    onChange={(e) => patchDraft({ price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum $0.50.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product_quantity">Quantity</Label>
                  <Input
                    id="product_quantity"
                    type="number"
                    min={0}
                    step={1}
                    value={draft.quantity}
                    onChange={(e) => patchDraft({ quantity: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product_shipping_rate">Shipping rate (USD)</Label>
            <Input
              id="product_shipping_rate"
              type="number"
              min={0}
              step="0.01"
              value={draft.shippingRate}
              onChange={(e) => patchDraft({ shippingRate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Flat shipping added at checkout for this item.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={saveProduct} disabled={!draft.title.trim()}>
              {editingId === "new" ? "Add product" : "Save product"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  product: WizardProductDraft;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const photo = product.photo_urls[0];
  const shippingCents = Math.round(parseFloat(product.shippingRate || "0") * 100);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {photo ? (
          <Image src={photo} alt={product.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.title}</p>
        <p className="text-sm text-muted-foreground">
          {product.auctionFields.saleType === "auction"
            ? `Auction · starting ${formatCurrency(Math.round(parseFloat(product.auctionFields.startingBid || product.price || "0") * 100))}`
            : `${formatCurrency(Math.round(parseFloat(product.price || "0") * 100))} · ${product.quantity} in stock`}
          {" · "}
          {shippingCents > 0 ? `${formatCurrency(shippingCents)} shipping` : "Free shipping"}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit product">
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDuplicate}
        aria-label="Duplicate product"
      >
        <Copy className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete product">
        <Trash2 className="size-4 text-live" />
      </Button>
    </div>
  );
}
