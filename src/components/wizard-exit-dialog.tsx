"use client";

import { Button } from "@/components/ui/button";

export function WizardExitDialog({
  open,
  pending,
  canSave,
  onCancel,
  onSaveAndExit,
  onExitWithoutSaving,
}: {
  open: boolean;
  pending: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSaveAndExit: () => void;
  onExitWithoutSaving: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-exit-title"
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 id="wizard-exit-title" className="text-lg font-semibold">
          Leave shop setup?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {canSave
            ? "Save your progress as a draft to finish later, or exit without saving."
            : "Add a shop name if you want to save a draft before leaving."}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={onExitWithoutSaving} disabled={pending}>
            Exit without saving
          </Button>
          <Button type="button" onClick={onSaveAndExit} disabled={pending || !canSave}>
            {pending ? "Saving…" : "Save draft & exit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
