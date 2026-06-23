/**
 * Site-wide living background: large, blurred aurora blobs in the PopUp brand
 * palette that slowly roam the viewport, plus a faint rotating conic shimmer
 * for depth. Rendered once in the root layout, fixed behind all content.
 *
 * - Colors reference the theme CSS variables, so it adapts to light/dark.
 * - Purely decorative: `aria-hidden`, `pointer-events-none`.
 * - All motion is CSS keyframes that respect `prefers-reduced-motion`.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Rotating conic shimmer — extremely subtle, adds depth behind blobs. */}
      <div
        className="animate-spin-slow absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
        style={{
          background:
            "conic-gradient(from 0deg, var(--primary), var(--highlight), var(--accent), var(--primary))",
        }}
      />

      {/* Coral blob — top-left */}
      <div
        className="animate-blob-a absolute -left-[10vw] -top-[12vh] h-[55vmax] w-[55vmax] rounded-full opacity-50 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--primary) 85%, transparent), transparent 70%)",
        }}
      />

      {/* Teal blob — bottom-right */}
      <div
        className="animate-blob-b absolute -bottom-[15vh] -right-[12vw] h-[60vmax] w-[60vmax] rounded-full opacity-45 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--accent) 80%, transparent), transparent 70%)",
        }}
      />

      {/* Yellow blob — center drifting */}
      <div
        className="animate-blob-c absolute left-[35vw] top-[30vh] h-[40vmax] w-[40vmax] rounded-full opacity-35 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--highlight) 75%, transparent), transparent 70%)",
        }}
      />

      {/* Violet blob — top-right, slow */}
      <div
        className="animate-blob-d absolute -top-[10vh] right-[10vw] h-[45vmax] w-[45vmax] rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, #7c3aed 75%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}
