"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Zap } from "lucide-react";
import { createShop, updateShop, type ActionState } from "@/app/dashboard/actions";
import { isInviteOnlyMode } from "@/lib/discovery";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { VisibilityPicker } from "@/components/visibility-picker";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime";
import type { Shop } from "@/lib/database.types";

const initialState: ActionState = { error: null };
const NEW_SHOP_DRAFT_KEY = "popup-new-shop-form";

type NewShopDraft = {
  name: string;
  description: string;
  startLocal: string;
  endLocal: string;
  liveUrl: string;
  visibility: "public" | "private";
};

function nowLocal(): string {
  return isoToLocalInput(new Date().toISOString());
}

function plusHoursLocal(h: number): string {
  return isoToLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());
}

function defaultNewShopDraft(): NewShopDraft {
  return {
    name: "",
    description: "",
    startLocal: plusHoursLocal(1),
    endLocal: plusHoursLocal(3),
    liveUrl: "",
    visibility: "private",
  };
}

function loadNewShopDraft(): NewShopDraft {
  if (typeof window === "undefined") return defaultNewShopDraft();
  try {
    const raw = sessionStorage.getItem(NEW_SHOP_DRAFT_KEY);
    if (!raw) return defaultNewShopDraft();
    return { ...defaultNewShopDraft(), ...JSON.parse(raw) };
  } catch {
    return defaultNewShopDraft();
  }
}

function SubmitButton({
  label,
  disabled,
  pendingLabel = "Saving…",
}: {
  label: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled} className="w-full sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ShopForm({ shop }: { shop: Shop }) {
  const [state, formAction] = useActionState(updateShop, initialState);
  const inviteOnly = isInviteOnlyMode();

  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? "");
  const [startLocal, setStartLocal] = useState(isoToLocalInput(shop.start_at));
  const [endLocal, setEndLocal] = useState(isoToLocalInput(shop.end_at));
  const [visibility, setVisibility] = useState<"public" | "private">(
    inviteOnly ? "private" : shop.visibility,
  );
  const [liveUrl, setLiveUrl] = useState(shop.live_url ?? "");

  const timeError =
    startLocal && endLocal && new Date(endLocal) <= new Date(startLocal)
      ? "Closing time must be after the opening time."
      : null;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="shop_id" value={shop.id} />
      <input type="hidden" name="start_at" value={localInputToIso(startLocal)} />
      <input type="hidden" name="end_at" value={localInputToIso(endLocal)} />
      <input type="hidden" name="visibility" value={visibility} />

      <ShopFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        coverUrl={shop.cover_url}
        coverHelp={
          inviteOnly
            ? "Shown on your shop page. While you're streaming, the live video takes its place."
            : "Shown on your shop and in Explore when you're not live. While you're streaming, the live video takes its place."
        }
        nameError={state.fieldErrors?.name}
      />

      <input type="hidden" name="shipping_rate" value="0" />

      <ScheduleFields
        startLocal={startLocal}
        setStartLocal={setStartLocal}
        endLocal={endLocal}
        setEndLocal={setEndLocal}
        liveUrl={liveUrl}
        setLiveUrl={setLiveUrl}
        timeError={timeError}
        showVisibility={!inviteOnly}
        visibility={visibility}
        setVisibility={setVisibility}
      />

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      <SubmitButton label="Save changes" />
    </form>
  );
}

/** Single-page create form — persists to sessionStorage; creates shop in one submit. */
export function CreateShopForm() {
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<NewShopDraft>(defaultNewShopDraft);
  const [state, formAction] = useActionState(createShop, initialState);
  const inviteOnly = isInviteOnlyMode();

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(loadNewShopDraft());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(NEW_SHOP_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const timeError =
    draft.startLocal &&
    draft.endLocal &&
    new Date(draft.endLocal) <= new Date(draft.startLocal)
      ? "Closing time must be after the opening time."
      : null;

  const canSubmit = draft.name.trim().length > 0 && !timeError;

  function patch(partial: Partial<NewShopDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="start_at" value={localInputToIso(draft.startLocal)} />
      <input type="hidden" name="end_at" value={localInputToIso(draft.endLocal)} />
      <input type="hidden" name="visibility" value={inviteOnly ? "private" : draft.visibility} />

      <p className="text-sm text-muted-foreground">
        Set up your shop details below. You&apos;ll land on your shop page to add products — refresh
        safe at any point after creating.
      </p>

      <ShopFields
        name={draft.name}
        setName={(name) => patch({ name })}
        description={draft.description}
        setDescription={(description) => patch({ description })}
        coverHelp="Shown on your shop page when buyers open your link."
        nameError={state.fieldErrors?.name}
      />

      <input type="hidden" name="shipping_rate" value="0" />

      <ScheduleFields
        startLocal={draft.startLocal}
        setStartLocal={(startLocal) => patch({ startLocal })}
        endLocal={draft.endLocal}
        setEndLocal={(endLocal) => patch({ endLocal })}
        liveUrl={draft.liveUrl}
        setLiveUrl={(liveUrl) => patch({ liveUrl })}
        timeError={timeError}
        showVisibility={!inviteOnly}
        visibility={draft.visibility}
        setVisibility={(visibility) => patch({ visibility })}
      />

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      <SubmitButton
        label="Create shop & add products"
        disabled={!canSubmit}
        pendingLabel="Creating…"
      />
    </form>
  );
}

function ShopFields({
  name,
  setName,
  description,
  setDescription,
  coverUrl,
  coverHelp,
  nameError,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  coverUrl?: string | null;
  coverHelp: string;
  nameError?: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Cover photo</Label>
        <ImageUpload
          name="cover_url"
          bucket="covers"
          defaultValue={coverUrl}
          label="Upload or drag a cover photo here"
        />
        <p className="text-xs text-muted-foreground">{coverHelp}</p>
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
          required
        />
        {nameError && <p className="text-sm text-live">{nameError}</p>}
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
    </>
  );
}

function ScheduleFields({
  startLocal,
  setStartLocal,
  endLocal,
  setEndLocal,
  liveUrl,
  setLiveUrl,
  timeError,
  showVisibility,
  visibility,
  setVisibility,
}: {
  startLocal: string;
  setStartLocal: (v: string) => void;
  endLocal: string;
  setEndLocal: (v: string) => void;
  liveUrl: string;
  setLiveUrl: (v: string) => void;
  timeError: string | null;
  showVisibility: boolean;
  visibility: "public" | "private";
  setVisibility: (v: "public" | "private") => void;
}) {
  return (
    <>
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

      {showVisibility && (
        <VisibilityPicker visibility={visibility} onChange={setVisibility} />
      )}

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
    </>
  );
}
