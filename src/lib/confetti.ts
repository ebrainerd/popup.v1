import confetti from "canvas-confetti";

const BRAND_COLORS = ["#ff3b8b", "#00e6c8", "#ffd60a", "#ffffff"];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** A short, celebratory burst — used for flash drops. */
export function celebrate() {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  });
}

/** A bigger, two-sided burst — used for completed purchases. */
export function bigCelebrate() {
  if (prefersReducedMotion()) return;
  const defaults = { colors: BRAND_COLORS, disableForReducedMotion: true };
  confetti({ ...defaults, particleCount: 120, spread: 100, origin: { y: 0.6 } });
  setTimeout(
    () => confetti({ ...defaults, particleCount: 60, angle: 60, spread: 70, origin: { x: 0 } }),
    150,
  );
  setTimeout(
    () => confetti({ ...defaults, particleCount: 60, angle: 120, spread: 70, origin: { x: 1 } }),
    250,
  );
}
