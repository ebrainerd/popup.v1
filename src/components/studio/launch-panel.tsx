"use client";

import { Check, Circle, Clock, Rocket, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PanelSection } from "@/components/studio/panel-ui";
import { getStepValidation, type ShopWizardDraft } from "@/lib/shop-wizard";
import { nowInTimeZone, plusHoursInTimeZone } from "@/lib/datetime";
import { DEFAULT_SCHEDULE_TIMEZONE, scheduleTimeZoneOptions } from "@/lib/timezones";
import { cn } from "@/lib/utils";

type ReadinessRow = { id: string; label: string; done: boolean; optional?: boolean };

/**
 * The Launch step: pick the drop's open/close window and see, at a glance,
 * everything still needed before publishing. Sellers set timing here — the
 * countdown is PopUp's signature, so it belongs in the build flow, not tucked
 * away on another page.
 */
export function StudioLaunchPanel({
  draft,
  onPatch,
}: {
  draft: ShopWizardDraft;
  onPatch: (partial: Partial<ShopWizardDraft>) => void;
}) {
  const scheduleValidation = getStepValidation("schedule", draft);
  const timeZone = draft.scheduleTimezone.trim() || DEFAULT_SCHEDULE_TIMEZONE;
  const timeError =
    draft.startLocal && draft.endLocal && draft.endLocal <= draft.startLocal
      ? "Closing time must be after the opening time."
      : null;

  const productsValid = getStepValidation("products", draft).valid;
  const readiness: ReadinessRow[] = [
    { id: "name", label: "Shop name added", done: Boolean(draft.name.trim()) },
    { id: "products", label: "At least one product ready", done: productsValid },
    { id: "schedule", label: "Open & close times set", done: scheduleValidation.valid },
    {
      id: "stream",
      label: "Stream set up",
      done:
        draft.streamSource === "native" ||
        Boolean(draft.youtubeUrl.trim() || draft.twitchUrl.trim()),
      optional: true,
    },
  ];

  function setScheduleField(
    partial: Partial<Pick<ShopWizardDraft, "startLocal" | "endLocal" | "scheduleTimezone">>,
  ) {
    onPatch({ ...partial, scheduleSet: true });
  }

  const tzOptions = scheduleTimeZoneOptions(timeZone);

  return (
    <div className="space-y-7">
      <PanelSection
        title="Drop schedule"
        description="Your shop opens and closes automatically at these times. Pick the timezone your buyers should expect — times below are in that zone."
      >
        {!draft.scheduleSet && (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-foreground">
              Pick when your drop opens and closes. Not sure yet? Start with the suggested times
              below — you can change them anytime before you publish.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="studio-timezone">Timezone</Label>
            <select
              id="studio-timezone"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
              value={timeZone}
              onChange={(e) => setScheduleField({ scheduleTimezone: e.target.value })}
            >
              {tzOptions.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Open and close times use this timezone (including daylight saving).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="studio-start" className="text-sm font-medium">
                Opens at
              </label>
              <button
                type="button"
                onClick={() => setScheduleField({ startLocal: nowInTimeZone(timeZone) })}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Zap className="size-3" /> Open now
              </button>
            </div>
            <Input
              id="studio-start"
              type="datetime-local"
              value={draft.startLocal}
              onChange={(e) => setScheduleField({ startLocal: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="studio-end" className="text-sm font-medium">
                Closes at
              </label>
              <button
                type="button"
                onClick={() => setScheduleField({ endLocal: plusHoursInTimeZone(3, timeZone) })}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Clock className="size-3" /> In 3 hours
              </button>
            </div>
            <Input
              id="studio-end"
              type="datetime-local"
              value={draft.endLocal}
              onChange={(e) => setScheduleField({ endLocal: e.target.value })}
            />
          </div>
        </div>

        {timeError && <p className="text-sm text-live">{timeError}</p>}
      </PanelSection>

      <PanelSection
        title="Ready to launch?"
        description="Everything you need before you publish your drop."
      >
        <div className="space-y-2">
          {readiness.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                row.done
                  ? "border-success/40 bg-success/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              {row.done ? (
                <Check className="size-4 shrink-0 text-success" />
              ) : (
                <Circle className="size-4 shrink-0" />
              )}
              <span className={cn(row.done && "line-through opacity-80")}>{row.label}</span>
              {row.optional && (
                <span className="ml-auto text-xs opacity-70">optional</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
          <Rocket className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Hit <span className="font-medium text-foreground">Finish setup</span> above to review
            your drop and publish it. Nothing goes live to buyers until you press publish.
          </p>
        </div>
      </PanelSection>
    </div>
  );
}
