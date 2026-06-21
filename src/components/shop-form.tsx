"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Globe, Lock, Check, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { createShop, updateShop, type ActionState } from "@/app/dashboard/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { cn } from "@/lib/utils";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime";
import type { Shop } from "@/lib/database.types";

const initialState: ActionState = { error: null };

function nowLocal(): string {
  return isoToLocalInput(new Date().toISOString());
}
function plusHoursLocal(h: number): string {
  return isoToLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ShopForm({ shop }: { shop?: Shop }) {
  const editing = Boolean(shop);
  const [state, formAction] = useActionState(editing ? updateShop : createShop, initialState);

  // Controlled field state (so wizard steps can hide without losing values and
  // so schedule times convert to ISO correctly regardless of server timezone).
  const [name, setName] = useState(shop?.name ?? "");
  const [description, setDescription] = useState(shop?.description ?? "");
  const [startLocal, setStartLocal] = useState(isoToLocalInput(shop?.start_at) || plusHoursLocal(1));
  const [endLocal, setEndLocal] = useState(isoToLocalInput(shop?.end_at) || plusHoursLocal(3));
  const [visibility, setVisibility] = useState<"public" | "private">(shop?.visibility ?? "public");
  const [shippingRate, setShippingRate] = useState(
    shop ? (shop.shipping_rate / 100).toFixed(2) : "0.00",
  );
  const [liveUrl, setLiveUrl] = useState(shop?.live_url ?? "");

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const timeError =
    startLocal && endLocal && new Date(endLocal) <= new Date(startLocal)
      ? "Closing time must be after the opening time."
      : null;

  const step1Valid = name.trim().length > 0;
  const step2Valid = Boolean(startLocal) && Boolean(endLocal) && !timeError;

  return (
    <form action={formAction} className="space-y-6">
      {shop && <input type="hidden" name="shop_id" value={shop.id} />}
      {/* Timezone-correct ISO timestamps (the visible pickers below have no name). */}
      <input type="hidden" name="start_at" value={localInputToIso(startLocal)} />
      <input type="hidden" name="end_at" value={localInputToIso(endLocal)} />
      <input type="hidden" name="visibility" value={visibility} />

      {!editing && <StepIndicator step={step} total={totalSteps} />}

      {/* STEP 1 — Details */}
      <div className={cn("space-y-6", !editing && step !== 1 && "hidden")}>
        {!editing && (
          <p className="text-sm text-muted-foreground">
            Step 1 — Tell buyers what your shop is. You&apos;ll add products after publishing.
          </p>
        )}
        <div className="space-y-2">
          <Label>Cover photo</Label>
          <ImageUpload
            name="cover_url"
            bucket="covers"
            defaultValue={shop?.cover_url}
            label="Upload or drag a cover photo here"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Shop name</Label>
          <Input
            id="name"
            name="name"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer sticker drop"
          />
          {state.fieldErrors?.name && <p className="text-sm text-live">{state.fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell buyers what makes this drop special."
          />
        </div>
      </div>

      {/* STEP 2 — Schedule & options */}
      <div className={cn("space-y-6", !editing && step !== 2 && "hidden")}>
        {!editing && (
          <p className="text-sm text-muted-foreground">
            Step 2 — Your shop opens and closes automatically on this schedule.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="start_local">Opens at</Label>
              <button
                type="button"
                onClick={() => setStartLocal(nowLocal())}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Zap className="size-3" /> Open now
              </button>
            </div>
            <Input
              id="start_local"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_local">Closes at</Label>
            <Input
              id="end_local"
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
          </div>
        </div>
        {timeError && <p className="text-sm text-live">{timeError}</p>}

        <fieldset className="space-y-2">
          <Label>Visibility</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 text-left",
                visibility === "public" && "border-primary bg-primary/5",
              )}
            >
              <Globe className="mt-0.5 size-4" />
              <span>
                <span className="block font-medium">Public</span>
                <span className="text-sm text-muted-foreground">Appears in Explore.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 text-left",
                visibility === "private" && "border-primary bg-primary/5",
              )}
            >
              <Lock className="mt-0.5 size-4" />
              <span>
                <span className="block font-medium">Private</span>
                <span className="text-sm text-muted-foreground">Shareable link only.</span>
              </span>
            </button>
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
              value={shippingRate}
              onChange={(e) => setShippingRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Added to each item at checkout.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="live_url">Live stream URL (optional)</Label>
            <Input
              id="live_url"
              name="live_url"
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
            />
            <p className="text-xs text-muted-foreground">YouTube or Twitch embeds; Instagram links out.</p>
          </div>
        </div>
      </div>

      {/* STEP 3 — Review (create only) */}
      {!editing && (
        <div className={cn("space-y-3", step !== 3 && "hidden")}>
          <p className="text-sm text-muted-foreground">Step 3 — Review and publish.</p>
          <dl className="divide-y divide-border rounded-lg border border-border text-sm">
            <Row label="Name" value={name || "—"} />
            <Row label="Opens" value={startLocal ? new Date(startLocal).toLocaleString() : "—"} />
            <Row label="Closes" value={endLocal ? new Date(endLocal).toLocaleString() : "—"} />
            <Row label="Visibility" value={visibility} />
            <Row label="Shipping" value={`$${shippingRate || "0.00"}`} />
          </dl>
          <p className="text-xs text-muted-foreground">
            After publishing you&apos;ll go to your shop dashboard to add products.
          </p>
        </div>
      )}

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      {/* Controls */}
      {editing ? (
        <SubmitButton label="Save changes" />
      ) : (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < totalSteps ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            >
              Next <ArrowRight className="size-4" />
            </Button>
          ) : (
            <SubmitButton label="Publish shop" />
          )}
        </div>
      )}
    </form>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ["Details", "Schedule", "Review"];
  return (
    <ol className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <li key={n} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              n < step && "bg-primary text-primary-foreground",
              n === step && "bg-primary text-primary-foreground ring-2 ring-primary/30",
              n > step && "bg-muted text-muted-foreground",
            )}
          >
            {n < step ? <Check className="size-4" /> : n}
          </span>
          <span className={cn("text-sm", n === step ? "font-medium" : "text-muted-foreground")}>
            {labels[n - 1]}
          </span>
          {n < total && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
