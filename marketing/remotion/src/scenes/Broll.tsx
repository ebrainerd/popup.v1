import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Grain, KineticWord } from "../components/shared";

/**
 * Cinematic b-roll scene. Uses the Veo clip when present; otherwise applies a
 * 2.5D treatment to the source still: dual-layer fake-parallax dolly (the
 * masked center zooms faster than the edges), a traveling light sweep, and
 * drifting dust motes — so the scene is never a static slide.
 */

const Dust: React.FC<{ seed: string }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const motes = Array.from({ length: 26 }, (_, i) => {
    const rx = random(`${seed}-x${i}`);
    const ry = random(`${seed}-y${i}`);
    const rs = random(`${seed}-s${i}`);
    const speed = 0.12 + random(`${seed}-v${i}`) * 0.3;
    const size = 2 + rs * 5;
    const y = ((ry * 1080 - frame * speed * 2.2) % 1180 + 1180) % 1180 - 50;
    const x = rx * 1920 + Math.sin(frame / 40 + i * 1.7) * 30;
    return { x, y, size, o: 0.12 + rs * 0.3 };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {motes.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: m.x,
            top: m.y,
            width: m.size,
            height: m.size,
            borderRadius: "50%",
            background: "#fff8ef",
            opacity: m.o,
            filter: `blur(${m.size > 4.5 ? 2.5 : 1}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const Broll: React.FC<{
  clip: string;
  fallbackImage?: string;
  words: string[];
  wordDelay?: number;
  accent?: string;
  align?: "left" | "center";
  fromScale?: number;
  toScale?: number;
  muted?: boolean;
  volume?: number;
  clipOffsetSec?: number;
}> = ({
  clip,
  fallbackImage,
  words,
  wordDelay = 14,
  accent = colors.pink,
  align = "left",
  fromScale = 1.06,
  toScale = 1.18,
  muted = false,
  volume = 0.55,
  clipOffsetSec = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = frame / durationInFrames;
  const drift = interpolate(t, [0, 1], [fromScale, toScale]);
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const sweep = interpolate(t, [0.05, 0.95], [-45, 135], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const media = clip ? (
    <AbsoluteFill style={{ transform: `scale(${drift})` }}>
      <OffthreadVideo
        src={staticFile(clip)}
        startFrom={Math.round(clipOffsetSec * fps)}
        muted={muted}
        volume={volume}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  ) : fallbackImage ? (
    <>
      {/* base layer: slow dolly + lateral drift */}
      <AbsoluteFill
        style={{
          transform: `scale(${drift}) translateX(${interpolate(t, [0, 1], [12, -12])}px) rotate(${interpolate(t, [0, 1], [-0.4, 0.4])}deg)`,
        }}
      >
        <Img src={staticFile(fallbackImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {/* parallax layer: masked center zooms faster (fake depth) */}
      <AbsoluteFill
        style={{
          transform: `scale(${drift * interpolate(t, [0, 1], [1.0, 1.075])}) translateX(${interpolate(t, [0, 1], [12, -12])}px) rotate(${interpolate(t, [0, 1], [-0.4, 0.4])}deg)`,
          WebkitMaskImage: "radial-gradient(46% 46% at 50% 48%, black 38%, transparent 72%)",
          maskImage: "radial-gradient(46% 46% at 50% 48%, black 38%, transparent 72%)",
        }}
      >
        <Img src={staticFile(fallbackImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {/* traveling warm light sweep */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `linear-gradient(115deg, transparent ${sweep - 18}%, rgba(255,238,214,0.16) ${sweep}%, transparent ${sweep + 18}%)`,
          mixBlendMode: "soft-light",
        }}
      />
      <Dust seed={fallbackImage} />
    </>
  ) : null;

  return (
    <AbsoluteFill style={{ background: colors.bgDeep }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>{media}</AbsoluteFill>
      {/* Heavy DOF-style vignette forcing the eye center-frame */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(90% 80% at 50% 45%, transparent 35%, rgba(5,4,8,0.55) 78%, rgba(5,4,8,0.92) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "linear-gradient(0deg, rgba(5,4,8,0.75) 0%, transparent 34%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: align === "center" ? "center" : "flex-start",
          padding: align === "center" ? "0 0 120px 0" : "0 0 110px 130px",
        }}
      >
        <div style={{ display: "flex", gap: 30, alignItems: "baseline" }}>
          {words.map((w, i) => (
            <KineticWord
              key={w}
              delay={wordDelay + i * 13}
              size={96}
              color={i === words.length - 1 ? accent : colors.white}
              glowColor={i === words.length - 1 ? accent : undefined}
              style={{ textShadow: i === words.length - 1 ? undefined : "0 6px 40px rgba(0,0,0,0.9)" }}
            >
              {w}
            </KineticWord>
          ))}
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: 21,
            letterSpacing: 4,
            color: "rgba(255,255,255,0.55)",
            opacity: interpolate(frame, [wordDelay + words.length * 13 + 6, wordDelay + words.length * 13 + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          @maya.clay — CERAMICS
        </div>
      </AbsoluteFill>
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
