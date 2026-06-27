"use client";

import { ChevronDown } from "lucide-react";

export function HeroScrollButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      aria-label="Scroll to how it works"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="mt-10 inline-flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/90 backdrop-blur-sm transition-[transform,background-color] hover:bg-white/20 hover:text-white motion-safe:animate-bounce"
    >
      <ChevronDown className="size-5" />
    </button>
  );
}
