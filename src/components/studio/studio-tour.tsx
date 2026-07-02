"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOUR_SEEN_KEY = "popup-studio-tour-seen";

type TourStep = {
  /** Matches a [data-tour] attribute in the studio. */
  target: string;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    target: "canvas",
    title: "This is your shop, live",
    body: "Everything you edit shows up here instantly, exactly as buyers will see it. Use the toolbar above the preview to peek at each phase of your drop, on desktop or mobile.",
  },
  {
    target: "tabs",
    title: "Build it from this panel",
    body: "Four tabs cover everything: your shop's name and banner, the products you're selling, your live stream, and the style of the page.",
  },
  {
    target: "save",
    title: "We save as you go",
    body: "Give your shop a name and every change autosaves as a draft. Leave anytime and pick up right where you stopped.",
  },
  {
    target: "finish",
    title: "Finish when you're happy",
    body: "This wraps up your draft. You'll pick your drop schedule and publish from the manage page, so nothing goes live before you're ready.",
  },
];

export function hasSeenStudioTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markStudioTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    // Best effort only.
  }
}

type TargetRect = { top: number; left: number; width: number; height: number };

/**
 * A four-step guided tour of the Shop Studio for first-time sellers.
 * Spotlights each area via [data-tour] anchors with a dimmed backdrop.
 */
export function StudioTour({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const r = el?.getBoundingClientRect();
    // Hidden targets (e.g. the save status on small screens) measure 0x0;
    // fall back to a plain dimmed backdrop instead of a stray spotlight.
    if (!r || r.width < 2 || r.height < 2) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.target]);

  useEffect(() => {
    // Bring the target on screen, then measure after layout settles. Re-measure
    // on resize AND any scroll (capture catches nested scroll containers), so
    // the fixed-position spotlight never drifts off its target.
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step.target]);

  function finish() {
    markStudioTourSeen();
    onDone();
  }

  // Spotlight box (slightly padded around the target); the giant box-shadow
  // dims everything else without a second overlay element.
  const pad = 6;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Anchor the card near the spotlight on sm+ screens; below it when there's
  // room, otherwise above. Small screens get a bottom sheet instead.
  const anchored = Boolean(spotlight && viewport && viewport.width >= 640);
  const cardBelow =
    spotlight && viewport ? spotlight.top + spotlight.height + 220 < viewport.height : true;
  const cardStyle: React.CSSProperties | undefined =
    anchored && spotlight && viewport
      ? {
          left: Math.min(Math.max(spotlight.left, 16), viewport.width - 356),
          top: cardBelow
            ? spotlight.top + spotlight.height + 14
            : Math.max(spotlight.top - 214, 16),
          bottom: "auto",
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Studio tour">
      {/* Click-through blocker */}
      <button
        type="button"
        aria-label="Skip tour"
        onClick={finish}
        className="absolute inset-0 cursor-default bg-transparent"
      />

      {spotlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.62)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/60" />
      )}

      <div
        className={cn(
          "absolute inset-x-3 bottom-4 sm:inset-x-auto sm:w-[340px]",
          "animate-fade-up rounded-2xl border border-border bg-card p-5 shadow-2xl",
        )}
        style={cardStyle}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="size-3.5" />
          Quick tour
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span
                key={s.target}
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={finish}
              >
                Skip
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
            >
              {isLast ? "Start building" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
