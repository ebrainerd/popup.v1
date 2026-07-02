"use client";

import { Monitor, Smartphone } from "lucide-react";
import { ShopThemePreview, type ShopPreviewPhase } from "@/components/shop-theme-preview";
import { Segmented } from "@/components/studio/panel-ui";
import type { ShopTheme } from "@/lib/shop-theme";
import { cn } from "@/lib/utils";

export type PreviewProduct = {
  title: string;
  price: string;
  photoUrl?: string;
};

export type StudioViewport = "desktop" | "mobile";

const PHASE_OPTIONS: { value: ShopPreviewPhase; label: string }[] = [
  { value: "scheduled", label: "Before open" },
  { value: "open", label: "Open" },
  { value: "live", label: "Live" },
];

/**
 * The center "canvas" of the studio: a dotted work surface with a floating
 * toolbar (drop phase + device) above an always-live preview of the shop.
 */
export function StudioCanvas({
  theme,
  shopName,
  coverUrl,
  products,
  phase,
  onPhaseChange,
  viewport,
  onViewportChange,
  className,
}: {
  theme: ShopTheme;
  shopName: string;
  coverUrl: string;
  products: PreviewProduct[];
  phase: ShopPreviewPhase;
  onPhaseChange: (phase: ShopPreviewPhase) => void;
  viewport: StudioViewport;
  onViewportChange: (viewport: StudioViewport) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      {/* Dotted work surface */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Floating toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-4 pt-4">
        <div className="w-auto">
          <Segmented
            size="sm"
            options={PHASE_OPTIONS}
            value={phase}
            onChange={onPhaseChange}
            className="glass-card w-auto"
          />
        </div>
        <div className="w-auto">
          <Segmented
            size="sm"
            options={[
              {
                value: "desktop" as const,
                label: <Monitor className="size-4" />,
                title: "Desktop preview",
              },
              {
                value: "mobile" as const,
                label: <Smartphone className="size-4" />,
                title: "Mobile preview",
              },
            ]}
            value={viewport}
            onChange={onViewportChange}
            className="glass-card w-auto"
          />
        </div>
      </div>

      {/* Scrollable preview area */}
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className={cn("mx-auto", viewport === "mobile" ? "max-w-[300px]" : "max-w-3xl")}>
          <ShopThemePreview
            theme={theme}
            shopName={shopName}
            coverUrl={coverUrl}
            products={products}
            viewport={viewport}
            phase={phase}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Live preview: this is what buyers see. It updates as you edit.
          </p>
        </div>
      </div>
    </div>
  );
}
