"use client";

/**
 * Full-viewport ambient background — drifting gradient orbs, a shifting mesh,
 * and floating sparkles. Pure CSS animations; respects prefers-reduced-motion.
 */
export function AnimatedBackground() {
  const sparkles = [
    { top: "8%", left: "12%", size: 3, delay: "0s", duration: "4.2s" },
    { top: "15%", left: "78%", size: 2, delay: "1.1s", duration: "5.1s" },
    { top: "22%", left: "45%", size: 4, delay: "0.4s", duration: "3.8s" },
    { top: "35%", left: "88%", size: 2, delay: "2.3s", duration: "4.6s" },
    { top: "42%", left: "6%", size: 3, delay: "1.8s", duration: "5.4s" },
    { top: "55%", left: "62%", size: 2, delay: "0.7s", duration: "3.5s" },
    { top: "60%", left: "28%", size: 4, delay: "2.9s", duration: "4.9s" },
    { top: "68%", left: "92%", size: 3, delay: "1.4s", duration: "5.8s" },
    { top: "72%", left: "52%", size: 2, delay: "0.2s", duration: "4.1s" },
    { top: "78%", left: "18%", size: 3, delay: "3.1s", duration: "3.9s" },
    { top: "85%", left: "72%", size: 2, delay: "1.6s", duration: "5.2s" },
    { top: "12%", left: "33%", size: 2, delay: "2.5s", duration: "4.4s" },
    { top: "48%", left: "38%", size: 3, delay: "0.9s", duration: "6.1s" },
    { top: "30%", left: "95%", size: 2, delay: "3.6s", duration: "4.7s" },
    { top: "90%", left: "42%", size: 3, delay: "2.0s", duration: "5.5s" },
    { top: "5%", left: "55%", size: 2, delay: "1.2s", duration: "3.7s" },
    { top: "50%", left: "8%", size: 4, delay: "0.5s", duration: "5.9s" },
    { top: "38%", left: "70%", size: 2, delay: "2.7s", duration: "4.3s" },
    { top: "82%", left: "85%", size: 3, delay: "1.9s", duration: "4.8s" },
    { top: "25%", left: "22%", size: 2, delay: "3.3s", duration: "5.0s" },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base */}
      <div className="absolute inset-0 bg-background" />

      {/* Shifting aurora mesh */}
      <div className="animate-aurora absolute inset-0 opacity-40 dark:opacity-50" />

      {/* Drifting color orbs */}
      <div className="animate-orb-1 absolute -left-[15%] -top-[10%] h-[55vh] w-[55vh] rounded-full bg-primary/25 blur-[120px] dark:bg-primary/20" />
      <div className="animate-orb-2 absolute -right-[10%] top-[20%] h-[45vh] w-[45vh] rounded-full bg-accent/20 blur-[100px] dark:bg-accent/15" />
      <div className="animate-orb-3 absolute -bottom-[15%] left-[25%] h-[50vh] w-[50vh] rounded-full bg-highlight/15 blur-[110px] dark:bg-highlight/10" />
      <div className="animate-orb-4 absolute -bottom-[5%] -right-[5%] h-[35vh] w-[35vh] rounded-full bg-primary/15 blur-[90px]" />

      {/* Sparkle particles */}
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="animate-sparkle absolute rounded-full bg-primary/60 dark:bg-white/50"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_75%)]" />
    </div>
  );
}
