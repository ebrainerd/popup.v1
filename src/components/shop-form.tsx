"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Globe, Lock } from "lucide-react";
import { createShop, updateShop, type ActionState } from "@/app/dashboard/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import type { Shop } from "@/lib/database.types";

const initialState: ActionState = { error: null };

/** Format an ISO timestamp for a <input type="datetime-local"> in local time. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultStart() {
  const d = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
  return toLocalInput(d.toISOString());
}
function defaultEnd() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3h from now
  return toLocalInput(d.toISOString());
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save changes" : "Publish shop"}
    </Button>
  );
}

export function ShopForm({ shop }: { shop?: Shop }) {
  const editing = Boolean(shop);
  const [state, formAction] = useActionState(
    editing ? updateShop : createShop,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {shop && <input type="hidden" name="shop_id" value={shop.id} />}

      <div className="space-y-2">
        <Label>Cover photo</Label>
        <ImageUpload
          name="cover_url"
          bucket="covers"
          defaultValue={shop?.cover_url}
          label="Upload a cover photo"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Shop name</Label>
        <Input id="name" name="name" required maxLength={120} defaultValue={shop?.name} placeholder="Summer sticker drop" />
        {state.fieldErrors?.name && <p className="text-sm text-live">{state.fieldErrors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={shop?.description ?? ""}
          placeholder="Tell buyers what makes this drop special."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="start_at">Opens at</Label>
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            required
            defaultValue={toLocalInput(shop?.start_at) || defaultStart()}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_at">Closes at</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            required
            defaultValue={toLocalInput(shop?.end_at) || defaultEnd()}
          />
          {state.fieldErrors?.end_at && (
            <p className="text-sm text-live">{state.fieldErrors.end_at}</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-2">
        <Label>Visibility</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked={!shop || shop.visibility === "public"}
              className="mt-1"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="size-4" /> Public
              </span>
              <span className="text-sm text-muted-foreground">Appears in Explore.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked={shop?.visibility === "private"}
              className="mt-1"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="size-4" /> Private
              </span>
              <span className="text-sm text-muted-foreground">Shareable link only.</span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="shipping_rate">Flat shipping rate (USD)</Label>
          <Input
            id="shipping_rate"
            name="shipping_rate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={shop ? (shop.shipping_rate / 100).toFixed(2) : "0.00"}
          />
          <p className="text-xs text-muted-foreground">Included in the item price at checkout.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="live_url">Live stream URL (optional)</Label>
          <Input
            id="live_url"
            name="live_url"
            type="url"
            defaultValue={shop?.live_url ?? ""}
            placeholder="https://youtube.com/watch?v=…"
          />
          <p className="text-xs text-muted-foreground">YouTube or Twitch embeds; Instagram links out.</p>
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
