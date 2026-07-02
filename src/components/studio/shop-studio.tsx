"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Package,
  Palette,
  Radio,
  Store,
} from "lucide-react";
import { finishShopSetup, saveShopDraft } from "@/app/dashboard/actions";
import { trackActiveDraftShop } from "@/components/continue-draft-shop";
import { isInviteOnlyMode } from "@/lib/discovery";
import { getPublicLiveKitUrl } from "@/lib/live-stream";
import {
  defaultWizardDraft,
  getStepValidation,
  wizardDraftToFinishPayload,
  wizardDraftToSavePayload,
  wizardHasDraftContent,
  type ShopWizardDraft,
} from "@/lib/shop-wizard";
import type { ShopPreviewPhase } from "@/components/shop-theme-preview";
import { Button } from "@/components/ui/button";
import { WizardExitDialog } from "@/components/wizard-exit-dialog";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { WizardProductManager } from "@/components/wizard-product-manager";
import { StudioCanvas, type StudioViewport } from "@/components/studio/studio-canvas";
import { StudioDetailsPanel } from "@/components/studio/details-panel";
import { StudioStreamPanel } from "@/components/studio/stream-panel";
import { StudioStylePanel } from "@/components/studio/style-panel";
import { PanelSection } from "@/components/studio/panel-ui";
import { cn } from "@/lib/utils";

type StudioTab = "shop" | "products" | "stream" | "style";

const TABS: { id: StudioTab; label: string; icon: typeof Store }[] = [
  { id: "shop", label: "Shop", icon: Store },
  { id: "products", label: "Products", icon: Package },
  { id: "stream", label: "Stream", icon: Radio },
  { id: "style", label: "Style", icon: Palette },
];

/** Which panel tab surfaces validation errors for each wizard step. */
const STEP_TO_TAB = { details: "shop", products: "products", live: "stream", layout: "style" } as const;

const AUTOSAVE_DELAY_MS = 2000;

/**
 * Shop Studio: the create/edit-draft experience. A live preview of the shop
 * fills the canvas from the very first keystroke, with all controls in a
 * side panel (details, products, stream, style). Drafts autosave once the
 * shop has a name.
 */
export function ShopStudio({
  initialDraft,
  shopId,
}: {
  initialDraft?: ShopWizardDraft;
  shopId?: string;
}) {
  const router = useRouter();
  const inviteOnly = isInviteOnlyMode();
  const nativeLiveEnabled = Boolean(getPublicLiveKitUrl());

  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<ShopWizardDraft>(initialDraft ?? defaultWizardDraft());
  const [tab, setTab] = useState<StudioTab>("shop");
  const [phase, setPhase] = useState<ShopPreviewPhase>("open");
  const [viewport, setViewport] = useState<StudioViewport>("desktop");
  const [lastSaved, setLastSaved] = useState<string>(() =>
    JSON.stringify(wizardDraftToSavePayload(initialDraft ?? defaultWizardDraft())),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishing, startFinishing] = useTransition();

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = initialDraft ?? defaultWizardDraft();
      // Every shop uses The Room layout; older drafts are coerced on load.
      const base: ShopWizardDraft = {
        ...loaded,
        theme: { ...loaded.theme, layout: "classic" },
      };
      setDraft(base);
      setLastSaved(JSON.stringify(wizardDraftToSavePayload(base)));
      setHydrated(true);
    });
  }, [initialDraft]);

  useEffect(() => {
    if (!hydrated || !shopId) return;
    trackActiveDraftShop(shopId, true);
  }, [hydrated, shopId]);

  const canSaveDraft = Boolean(draft.name.trim());
  const dirty = useMemo(
    () => hydrated && JSON.stringify(wizardDraftToSavePayload(draft)) !== lastSaved,
    [draft, hydrated, lastSaved],
  );

  const runSave = useCallback(async (): Promise<boolean> => {
    if (!draft.name.trim()) return false;

    const payload = wizardDraftToSavePayload(draft);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSaved) return true;

    setSaving(true);
    const res = await saveShopDraft(payload);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return false;
    }

    setError(null);
    if (res.shopId && !draft.shopId) {
      trackActiveDraftShop(res.shopId, true);
      setDraft((prev) => ({ ...prev, shopId: res.shopId }));
      setLastSaved(JSON.stringify(wizardDraftToSavePayload({ ...draft, shopId: res.shopId })));
      // Keep the URL resumable without a disruptive client navigation.
      window.history.replaceState(null, "", `/dashboard/shops/${res.shopId}/setup`);
    } else {
      setLastSaved(serialized);
    }
    return true;
  }, [draft, lastSaved]);

  // Debounced autosave: any edit resets the timer; trailing edits made while a
  // save is in flight re-trigger it because `dirty` recomputes off `lastSaved`.
  useEffect(() => {
    if (!hydrated || !dirty || !canSaveDraft || saving || finishing) return;
    const timer = setTimeout(() => void runSave(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, dirty, canSaveDraft, saving, finishing, runSave]);

  function patch(partial: Partial<ShopWizardDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  }

  function handleFinish() {
    for (const stepId of ["details", "products", "live"] as const) {
      const result = getStepValidation(stepId, draft);
      if (!result.valid) {
        setTab(STEP_TO_TAB[stepId]);
        setError(result.message ?? "Complete the highlighted section to finish.");
        return;
      }
    }

    setError(null);
    startFinishing(async () => {
      try {
        const res = await finishShopSetup(wizardDraftToFinishPayload(draft));
        if (res?.error) setError(res.error);
      } catch {
        // finishShopSetup redirects on success; the router handles navigation.
        router.refresh();
      }
    });
  }

  function requestExit() {
    if (!wizardHasDraftContent(draft) || !dirty) {
      router.push("/dashboard");
      return;
    }
    setExitOpen(true);
  }

  const previewProducts = draft.products
    .filter((p) => p.title.trim())
    .map((p) => ({
      title: p.title,
      price: p.price || p.auctionFields.startingBid || "0",
      photoUrl: p.photo_urls[0],
    }));

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading your studio…</p>;
  }

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2">
      <div className="flex flex-col lg:h-[calc(100dvh-4rem)]">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={requestExit}
              aria-label="Back to dashboard"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">
                {draft.name.trim() || "New shop"}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">Shop Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SaveStatus saving={saving} dirty={dirty} hasError={Boolean(error)} canSave={canSaveDraft} />
            {shopId && (
              <DeleteDraftButton shopId={shopId} shopName={draft.name.trim() || undefined} />
            )}
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              onClick={handleFinish}
              disabled={finishing}
            >
              {finishing ? "Finishing…" : "Finish setup"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="border-b border-live/20 bg-live/10 px-4 py-2 text-sm text-live">{error}</p>
        )}

        {/* Canvas + panel */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <StudioCanvas
            theme={draft.theme}
            shopName={draft.name}
            coverUrl={draft.coverUrl}
            products={previewProducts}
            phase={phase}
            onPhaseChange={setPhase}
            viewport={viewport}
            onViewportChange={setViewport}
            className="h-[46vh] border-b border-border/60 lg:h-auto lg:border-b-0"
          />

          <aside className="flex min-h-0 flex-col border-border/60 bg-card/30 lg:w-[400px] lg:shrink-0 lg:border-l">
            {/* Panel tabs */}
            <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-border/60 p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                    tab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
              {tab === "shop" && (
                <StudioDetailsPanel draft={draft} onPatch={patch} inviteOnly={inviteOnly} />
              )}
              {tab === "products" && (
                <PanelSection
                  title="Products"
                  description="Add at least one product. Each can be Buy Now or a live auction."
                >
                  <WizardProductManager
                    products={draft.products}
                    onProductsChange={(products) => patch({ products })}
                  />
                </PanelSection>
              )}
              {tab === "stream" && (
                <StudioStreamPanel
                  draft={draft}
                  onPatch={patch}
                  nativeLiveEnabled={nativeLiveEnabled}
                />
              )}
              {tab === "style" && (
                <StudioStylePanel theme={draft.theme} onChange={(theme) => patch({ theme })} />
              )}
            </div>
          </aside>
        </div>
      </div>

      <WizardExitDialog
        open={exitOpen}
        pending={saving}
        canSave={canSaveDraft}
        onCancel={() => setExitOpen(false)}
        onSaveAndExit={async () => {
          setExitOpen(false);
          await runSave();
          router.push("/dashboard");
        }}
        onExitWithoutSaving={() => {
          setExitOpen(false);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}

function SaveStatus({
  saving,
  dirty,
  hasError,
  canSave,
}: {
  saving: boolean;
  dirty: boolean;
  hasError: boolean;
  canSave: boolean;
}) {
  if (!canSave) {
    return (
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Name your shop to save
      </span>
    );
  }

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 text-xs sm:inline-flex",
        hasError ? "text-live" : "text-muted-foreground",
      )}
    >
      {saving ? (
        <>
          <CloudUpload className="size-3.5 animate-pulse" /> Saving…
        </>
      ) : hasError ? (
        <>Save failed</>
      ) : dirty ? (
        <>Unsaved changes</>
      ) : (
        <>
          <Check className="size-3.5 text-success" /> Draft saved
        </>
      )}
    </span>
  );
}
