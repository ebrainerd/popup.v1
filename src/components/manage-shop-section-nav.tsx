"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "shop-details", label: "Details" },
  { id: "products", label: "Products" },
  { id: "shop-appearance", label: "Appearance" },
  { id: "live-controls", label: "Live" },
  { id: "orders", label: "Orders" },
] as const;

/**
 * Mobile-only sticky jump nav for the long manage-shop page.
 * Sits under the site header (`top-16`) and scrolls to section cards.
 */
export function ManageShopSectionNav() {
  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Expand collapsed section before scrolling (CollapsibleSection listens for hash).
    window.history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // Let React open the section, then scroll with header+nav offset.
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <nav
      aria-label="Shop sections"
      className={cn(
        "sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur",
        "md:hidden",
      )}
    >
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jump(section.id)}
            className={cn(
              "shrink-0 rounded-full border border-border bg-card px-3.5 py-2",
              "text-sm font-medium text-foreground",
              "min-h-11 touch-manipulation",
              "active:bg-muted",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
