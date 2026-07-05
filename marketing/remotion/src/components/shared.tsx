import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, glow } from "../theme";

type SpringConfig = { damping: number; mass: number; stiffness: number };

/** Snappy start, buttery deceleration — the house spring. */
export const SNAP: SpringConfig = { damping: 16, mass: 0.7, stiffness: 130 };
/** Softer spring for drifty secondary motion. */
export const SOFT: SpringConfig = { damping: 22, mass: 1.1, stiffness: 60 };
/** Aggressive pop for badges/chips. */
export const POP: SpringConfig = { damping: 12, mass: 0.5, stiffness: 210 };

export const useSpring = (delay: number, config: SpringConfig = SNAP, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config, durationInFrames });
};

/** Dark scene background: deep radial gradient + drifting glow blobs + vignette. */
export const DarkStage: React.FC<{
  children?: React.ReactNode;
  accent?: string;
  vignette?: number;
}> = ({ children, accent = colors.pink, vignette = 0.85 }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 55) * 60;
  const drift2 = Math.cos(frame / 70) * 80;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 120% at 50% 30%, #16161d 0%, ${colors.bgDeep} 70%)` }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: `calc(18% + ${drift}px)`,
          top: "-25%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}30 0%, transparent 65%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          right: `calc(8% + ${drift2}px)`,
          bottom: "-30%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.teal}22 0%, transparent 65%)`,
          filter: "blur(70px)",
        }}
      />
      {children}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(115% 100% at 50% 42%, transparent 42%, rgba(4,4,8,${vignette}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Cream scene background for light contrast scenes. */
export const CreamStage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 130% at 50% 20%, #fffdfb 0%, ${colors.creamWarm} 58%, #eddcd3 100%)` }}>
      {children}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(120% 105% at 50% 45%, transparent 55%, rgba(96,58,44,0.28) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** The PopUp "P" logo badge, matching src/components/logo.tsx. */
export const LogoBadge: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 56, style }) => (
  <span
    style={{
      display: "inline-flex",
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: size * 0.29,
      background: colors.pink,
      color: colors.white,
      fontFamily: fonts.sans,
      fontWeight: 800,
      fontSize: size * 0.58,
      boxShadow: glow(colors.pink, size / 80),
      ...style,
    }}
  >
    P
  </span>
);

/** Pulsing LIVE badge, matching the app's live pill. */
export const LiveBadge: React.FC<{ scale?: number; delay?: number }> = ({ scale = 1, delay = 0 }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(delay, POP);
  const pulse = 1 + Math.sin(Math.max(0, frame - delay) / 5.2) * 0.045;
  const glowPulse = 0.75 + Math.sin(Math.max(0, frame - delay) / 5.2) * 0.35;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10 * scale,
        padding: `${8 * scale}px ${20 * scale}px`,
        borderRadius: 999,
        background: colors.pink,
        color: colors.white,
        fontFamily: fonts.sans,
        fontWeight: 800,
        fontSize: 26 * scale,
        letterSpacing: 2.5 * scale,
        transform: `scale(${enter * pulse})`,
        boxShadow: glow(colors.pink, glowPulse * scale),
      }}
    >
      <span
        style={{
          width: 12 * scale,
          height: 12 * scale,
          borderRadius: "50%",
          background: colors.white,
          boxShadow: `0 0 ${10 * scale}px #fff`,
        }}
      />
      LIVE
    </span>
  );
};

/** Floating UI card with app styling (dark theme). */
export const Card: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  light?: boolean;
}> = ({ children, style, light }) => (
  <div
    style={{
      background: light ? "#ffffff" : colors.card,
      border: `1.5px solid ${light ? "#e8ddd6" : colors.cardBorder}`,
      borderRadius: 26,
      boxShadow: light
        ? "0 30px 80px -20px rgba(96,58,44,0.35), 0 8px 24px rgba(96,58,44,0.12)"
        : "0 40px 100px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03) inset",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Kinetic word: slams up into place with overshoot + blur-in. */
export const KineticWord: React.FC<{
  children: React.ReactNode;
  delay: number;
  size?: number;
  color?: string;
  glowColor?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, delay, size = 150, color = colors.white, glowColor, weight = 900, style }) => {
  const frame = useCurrentFrame();
  const s = useSpring(delay, SNAP);
  const blur = interpolate(s, [0, 0.7, 1], [18, 4, 0]);
  const y = interpolate(s, [0, 1], [120, 0]);
  return (
    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.035,
        color,
        transform: `translateY(${y}px) scale(${0.86 + s * 0.14})`,
        opacity: Math.min(1, s * 1.6),
        filter: `blur(${frame < delay ? 18 : blur}px)`,
        textShadow: glowColor ? glow(glowColor, 0.8) : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Rolling number counter with mono font. */
export const useCountUp = (delay: number, from: number, to: number, durationFrames: number) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // easeOutExpo for satisfying "tick fast then settle"
  const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  return from + (to - from) * eased;
};

/** Film grain + subtle scanline overlay to unify scenes. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "280px 280px",
        backgroundPosition: `${(frame * 37) % 280}px ${(frame * 53) % 280}px`,
        mixBlendMode: "overlay",
      }}
    />
  );
};
