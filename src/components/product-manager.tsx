"use client";

import { useActionState, useRef, useState, useTransition } from "react";
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
import { ImageUpload } from "@/components/image-upload";
import { formatCurrency } from "@/lib/utils";

const initialState: ActionState = { error: null };

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
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await createProduct(prev, fd);
    if (!res.error) {
      formRef.current?.reset();
    }
    return res;
  }, initialState);

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
          <h3 className="font-semibold">New product</h3>

          <div className="space-y-2">
            <Label>Photo</Label>
            <ImageUpload name="photo_url" bucket="products" aspect="square" label="Upload product photo" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={140} placeholder="Hand-printed tote bag" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Material, size, details…" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (USD, shipping included)</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" required placeholder="24.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" min={0} step={1} defaultValue={1} required />
            </div>
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
  const [fields, setFields] = useState({
    title: product.title,
    description: product.description ?? "",
    price: (product.price / 100).toFixed(2),
    quantity: String(product.quantity),
    photo_url: product.photo_url ?? "",
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateProduct({
        product_id: product.id,
        shop_id: shopId,
        title: fields.title,
        description: fields.description,
        photo_url: fields.photo_url,
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
        <ImageUpload
          name={`edit_photo_${product.id}`}
          bucket="products"
          aspect="square"
          defaultValue={fields.photo_url || null}
          label="Upload product photo"
          onChange={(u) => setFields((f) => ({ ...f, photo_url: u }))}
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
            min={0}
            step="0.01"
            value={fields.price}
            onChange={(e) => setFields({ ...fields, price: e.target.value })}
            placeholder="Price"
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
          {formatCurrency(product.price)} · {product.quantity} in stock
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
