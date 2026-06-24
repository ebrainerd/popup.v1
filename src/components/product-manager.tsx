"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ActionState,
} from "@/app/dashboard/actions";
import type { Product } from "@/lib/database.types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiImageUpload } from "@/components/multi-image-upload";
import {
  AuctionFields,
  SaleTypePicker,
  defaultAuctionFields,
  type AuctionFieldState,
} from "@/components/auction-product-fields";
import { formatCurrency } from "@/lib/utils";

const initialState: ActionState = { error: null };

type ProductDraft = {
  title: string;
  description: string;
  price: string;
  quantity: string;
};

function productDraftKey(shopId: string) {
  return `popup-product-draft:${shopId}`;
}

function loadProductDraft(shopId: string): ProductDraft {
  if (typeof window === "undefined") {
    return { title: "", description: "", price: "", quantity: "1" };
  }
  try {
    const raw = sessionStorage.getItem(productDraftKey(shopId));
    if (!raw) return { title: "", description: "", price: "", quantity: "1" };
    return { title: "", description: "", price: "", quantity: "1", ...JSON.parse(raw) };
  } catch {
    return { title: "", description: "", price: "", quantity: "1" };
  }
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Adding…" : "Add product"}
    </Button>
  );
}

export function ProductManager({
  shopId,
  products,
}: {
  shopId: string;
  products: Product[];
}) {
  const [showForm, setShowForm] = useState(products.length === 0);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>({
    title: "",
    description: "",
    price: "",
    quantity: "1",
  });
  const [auctionFields, setAuctionFields] = useState<AuctionFieldState>(defaultAuctionFields());
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await createProduct(prev, fd);
    if (!res.error) {
      formRef.current?.reset();
      sessionStorage.removeItem(productDraftKey(shopId));
      setDraft({ title: "", description: "", price: "", quantity: "1" });
      setAuctionFields(defaultAuctionFields());
    }
    return res;
  }, initialState);

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(loadProductDraft(shopId));
      setHydrated(true);
    });
  }, [shopId]);

  useEffect(() => {
    if (!hydrated || !showForm) return;
    sessionStorage.setItem(productDraftKey(shopId), JSON.stringify(draft));
  }, [draft, hydrated, showForm, shopId]);

  function patch(partial: Partial<ProductDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No products yet. Add your first item below.
          </p>
        ) : (
          products.map((p) => <ProductRow key={p.id} product={p} shopId={shopId} />)
        )}
      </div>

      {!showForm && (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add another product
        </Button>
      )}

      {showForm && (
        <form
          ref={formRef}
          action={formAction}
          className="space-y-4 rounded-lg border border-border p-4"
        >
          <input type="hidden" name="shop_id" value={shopId} />
          <input type="hidden" name="sale_type" value={auctionFields.saleType} />
          <h3 className="font-semibold">New product</h3>

          <SaleTypePicker
            value={auctionFields.saleType}
            onChange={(saleType) =>
              setAuctionFields((f) => ({
                ...f,
                saleType,
                ...(saleType === "auction" ? { startingBid: draft.price || f.startingBid } : {}),
              }))
            }
          />

          <AuctionFields state={auctionFields} onChange={(p) => setAuctionFields((f) => ({ ...f, ...p }))} />

          <div className="space-y-2">
            <Label>Photos</Label>
            <MultiImageUpload name="photo_urls" bucket="products" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={140}
              placeholder="Hand-printed tote bag"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Material, size, details…"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {auctionFields.saleType === "buy_now" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={0.5}
                    step="0.01"
                    required
                    placeholder="24.00"
                    value={draft.price}
                    onChange={(e) => patch({ price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum $0.50.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={draft.quantity}
                    onChange={(e) => patch({ quantity: e.target.value })}
                  />
                </div>
              </>
            )}
            {auctionFields.saleType === "auction" && (
              <input type="hidden" name="quantity" value="1" />
            )}
          </div>

          {state.error && (
            <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
          )}

          <div className="flex gap-2">
            <AddButton />
            {products.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function ProductRow({ product, shopId }: { product: Product; shopId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initialPhotos =
    product.photo_urls && product.photo_urls.length > 0
      ? product.photo_urls
      : product.photo_url
        ? [product.photo_url]
        : [];
  const [fields, setFields] = useState({
    title: product.title,
    description: product.description ?? "",
    price: (product.price / 100).toFixed(2),
    quantity: String(product.quantity),
    photo_urls: initialPhotos,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateProduct({
        product_id: product.id,
        shop_id: shopId,
        title: fields.title,
        description: fields.description,
        photo_urls: fields.photo_urls,
        price: parseFloat(fields.price) || 0,
        quantity: parseInt(fields.quantity) || 0,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-lg border border-primary/40 p-3">
        <MultiImageUpload
          bucket="products"
          defaultValue={fields.photo_urls}
          onChange={(urls) => setFields((f) => ({ ...f, photo_urls: urls }))}
        />
        <Input
          value={fields.title}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
          placeholder="Title"
        />
        <Textarea
          rows={2}
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          placeholder="Description"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0.5}
            step="0.01"
            value={fields.price}
            onChange={(e) => setFields({ ...fields, price: e.target.value })}
            placeholder="Price (min $0.50)"
          />
          <Input
            type="number"
            min={0}
            step={1}
            value={fields.quantity}
            onChange={(e) => setFields({ ...fields, quantity: e.target.value })}
            placeholder="Qty"
          />
        </div>
        {error && <p className="text-xs text-live">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={pending || !fields.title.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {product.photo_url ? (
          <Image src={product.photo_url} alt={product.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.title}</p>
        <p className="text-sm text-muted-foreground">
          {product.sale_type === "auction"
            ? `Auction · starting ${formatCurrency(product.auction_starting_bid ?? product.price)}`
            : `${formatCurrency(product.price)} · ${product.quantity} in stock`}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit product">
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete "${product.title}"?`)) {
            startTransition(async () => {
              await deleteProduct(product.id, shopId);
              router.refresh();
            });
          }
        }}
        aria-label="Delete product"
      >
        <Trash2 className="size-4 text-live" />
      </Button>
    </div>
  );
}
