/**
 * Full-viewport ambient background. Three slow drifting orbs in the brand
 * accents (ember / teal / amber) over the page base, plus a faint dot grid
 * and a depth vignette. Pure CSS, GPU-friendly (transform/opacity only),
 * and fully static under prefers-reduced-motion.
 */
export function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base */}
      <div className="absolute inset-0 bg-background" />

      {/* Drifting brand orbs: ember, teal, amber */}
      <div className="animate-orb-1 absolute -left-[15%] -top-[10%] h-[55vh] w-[55vh] rounded-full bg-primary/15 blur-[120px] dark:bg-primary/20" />
      <div className="animate-orb-2 absolute -right-[10%] top-[18%] h-[45vh] w-[45vh] rounded-full bg-accent/12 blur-[110px] dark:bg-accent/15" />
      <div className="animate-orb-3 absolute -bottom-[15%] left-[28%] h-[48vh] w-[48vh] rounded-full bg-highlight/10 blur-[120px] dark:bg-highlight/10" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_78%)]" />
    </div>
  );
}
