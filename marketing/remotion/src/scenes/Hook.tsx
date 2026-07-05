import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";
import { DarkStage, Grain, KineticWord, LiveBadge, LogoBadge, Sfx, useSpring, POP } from "../components/shared";

/**
 * Scene 1 — Hook: "Your drop. Live." kinetic type slam with LIVE badge,
 * ends with a camera push toward the badge (cut into the b-roll).
 */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const logoIn = useSpring(2, POP);

  // Ending push-in: accelerate zoom into the center for a match cut.
  const outStart = durationInFrames - 18;
  const zoomOut = interpolate(frame, [outStart, durationInFrames], [1, 2.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoomEase = 1 + (zoomOut - 1) * (zoomOut - 1) * 0.55;

  return (
    <DarkStage>
      <Sfx src="bass_hit" at={10} />
      <Sfx src="bass_hit" at={26} volume={0.9} rate={1.12} />
      <Sfx src="pop" at={40} volume={0.8} />
      <Sfx src="whoosh" at={outStart} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${zoomEase})`,
          transformOrigin: "50% 54%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
          <div style={{ transform: `scale(${logoIn})`, marginBottom: 6 }}>
            <LogoBadge size={84} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 42 }}>
            <KineticWord delay={10} size={168}>
              Your drop.
            </KineticWord>
            <KineticWord delay={26} size={168} color={colors.pink} glowColor={colors.pink}>
              Live.
            </KineticWord>
          </div>
          <div style={{ marginTop: 14 }}>
            <LiveBadge scale={1.35} delay={40} />
          </div>
        </div>
      </AbsoluteFill>
      <Grain />
    </DarkStage>
  );
};
