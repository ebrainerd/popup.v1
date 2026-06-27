"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackActiveDraftShop } from "@/components/continue-draft-shop";
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, Radio, Zap } from "lucide-react";
import { finishShopSetup } from "@/app/dashboard/actions";
import { isInviteOnlyMode } from "@/lib/discovery";
import { isoToLocalInput } from "@/lib/datetime";
import {
  WIZARD_STEPS,
  canNavigateToStep,
  clearWizardDraftStorage,
  defaultWizardDraft,
  getStepValidation,
  loadWizardDraftFromStorage,
  markStepComplete,
  saveWizardDraftToStorage,
  wizardDraftToFinishPayload,
  type ShopWizardDraft,
} from "@/lib/shop-wizard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { VisibilityPicker } from "@/components/visibility-picker";
import { WizardProductManager } from "@/components/wizard-product-manager";
import { cn } from "@/lib/utils";

function nowLocal(): string {
  return isoToLocalInput(new Date().toISOString());
}

export function ShopSetupWizard({
  initialDraft,
  shopId,
}: {
  initialDraft?: ShopWizardDraft;
  shopId?: string;
}) {
  const router = useRouter();
  const inviteOnly = isInviteOnlyMode();
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<ShopWizardDraft>(initialDraft ?? defaultWizardDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadWizardDraftFromStorage(shopId);
      if (stored) {
        setDraft(stored);
      } else if (initialDraft) {
        setDraft(initialDraft);
      }
      setHydrated(true);
    });
  }, [initialDraft, shopId]);

  useEffect(() => {
    if (!hydrated) return;
    saveWizardDraftToStorage(draft);
    if (shopId) trackActiveDraftShop(shopId, true);
  }, [draft, hydrated, shopId]);

  const currentStep = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  function patch(partial: Partial<ShopWizardDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  }

  function goToStep(index: number) {
    if (!canNavigateToStep(index, draft)) return;
    setStepIndex(index);
    setError(null);
  }

  function handleContinue() {
    const result = getStepValidation(currentStep.id, draft);
    if (!result.valid) {
      setError(result.message ?? "Complete this step before continuing.");
      return;
    }

    const nextDraft = markStepComplete(draft, currentStep.id);
    setDraft(nextDraft);
    setError(null);

    if (isLastStep) {
      startTransition(async () => {
        try {
          const res = await finishShopSetup(wizardDraftToFinishPayload(nextDraft));
          if (res?.error) setError(res.error);
        } catch {
          clearWizardDraftStorage(shopId);
          router.refresh();
        }
      });
      return;
    }

    setStepIndex((i) => i + 1);
  }

  function handleBack() {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading setup…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{shopId ? "Continue shop setup" : "Create a shop"}</h1>
        <p className="mt-1 text-muted-foreground">
          Work through each section — your progress is saved locally until you finish setup.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <nav className="hidden lg:block">
            <ol className="space-y-1">
              {WIZARD_STEPS.map((step, index) => {
                const reachable = canNavigateToStep(index, draft);
                const complete = draft.completedSteps.includes(step.id);
                const active = index === stepIndex;

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => goToStep(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        active && "bg-primary/10 text-foreground",
                        !active && reachable && "text-muted-foreground hover:bg-muted hover:text-foreground",
                        !reachable && "cursor-not-allowed text-muted-foreground/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          complete && "border-primary bg-primary text-primary-foreground",
                          active && !complete && "border-primary text-primary",
                        )}
                      >
                        {complete ? <Check className="size-3.5" /> : index + 1}
                      </span>
                      <span className="font-medium">{step.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {WIZARD_STEPS.map((step, index) => {
              const reachable = canNavigateToStep(index, draft);
              const active = index === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                    active && "border-primary bg-primary/10 text-foreground",
                    !active && reachable && "text-muted-foreground",
                    !reachable && "cursor-not-allowed text-muted-foreground/50",
                  )}
                >
                  {step.shortLabel}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">
              Step {stepIndex + 1} of {WIZARD_STEPS.length}
            </p>
            <h2 className="mt-1 text-xl font-bold">{currentStep.label}</h2>
          </div>

          {currentStep.id === "details" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Shop name</Label>
                <Input
                  id="name"
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Summer sticker drop"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Tell buyers what makes this drop special."
                />
              </div>
              {!inviteOnly && (
                <VisibilityPicker
                  visibility={draft.visibility}
                  onChange={(visibility) => patch({ visibility })}
                />
              )}
            </div>
          )}

          {currentStep.id === "products" && (
            <WizardProductManager
              products={draft.products}
              shippingRate={draft.shippingRate}
              onProductsChange={(products) => patch({ products })}
              onShippingRateChange={(shippingRate) => patch({ shippingRate })}
            />
          )}

          {currentStep.id === "live" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Shop banner</Label>
                <ImageUpload
                  name="cover_url"
                  bucket="covers"
                  defaultValue={draft.coverUrl}
                  onChange={(coverUrl) => patch({ coverUrl })}
                  label="Upload or drag a banner image here"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on your shop page when you&apos;re not live.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="youtube_url">YouTube stream URL (optional)</Label>
                <Input
                  id="youtube_url"
                  type="url"
                  value={draft.youtubeUrl}
                  onChange={(e) => patch({ youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="twitch_url">Twitch stream URL (optional)</Label>
                <Input
                  id="twitch_url"
                  type="url"
                  value={draft.twitchUrl}
                  onChange={(e) => patch({ twitchUrl: e.target.value })}
                  placeholder="https://twitch.tv/yourchannel"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Radio className="mt-0.5 size-4 shrink-0 text-primary" />
                  When your shop is open, you can go live natively in the app — no external link
                  required. Add YouTube or Twitch links here if you prefer to stream there instead.
                </p>
              </div>
            </div>
          )}

          {currentStep.id === "schedule" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="start_local">Opens at</Label>
                    <button
                      type="button"
                      onClick={() => patch({ startLocal: nowLocal() })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Zap className="size-3" /> Open now
                    </button>
                  </div>
                  <Input
                    id="start_local"
                    type="datetime-local"
                    value={draft.startLocal}
                    onChange={(e) => patch({ startLocal: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_local">Closes at</Label>
                  <Input
                    id="end_local"
                    type="datetime-local"
                    value={draft.endLocal}
                    onChange={(e) => patch({ endLocal: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep.id === "layout" && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <LayoutTemplate className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Customize your shop layout</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Layout customization is coming soon. For now, your shop will use the default PopUp
                drop page design.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md bg-live/10 px-3 py-2 text-sm text-live">{error}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={stepIndex === 0 || pending}>
              Back
            </Button>
            <Button type="button" onClick={handleContinue} disabled={pending}>
              {pending ? "Saving…" : isLastStep ? "Finish setup" : "Continue"}
              {!pending && !isLastStep && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
