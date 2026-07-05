import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, glow } from "../theme";
import { DarkStage, Grain, KineticWord, LogoBadge, POP, SNAP, useSpring } from "../components/shared";

/**
 * Scene 9 — outro: the P badge drops in with a glow shockwave, wordmark and
 * CTA button follow; button breathes with a pink glow pulse.
 */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const logoIn = useSpring(4, { damping: 12, mass: 0.9, stiffness: 190 });
  const wordIn = useSpring(12, SNAP);
  const ctaIn = useSpring(34, POP);
  const urlIn = useSpring(46, SNAP);
  const ring = interpolate(frame, [6, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const breathe = 1 + Math.sin(Math.max(0, frame - 44) / 9) * 0.022;
  const glowBreathe = 0.9 + Math.sin(Math.max(0, frame - 44) / 9) * 0.45;

  return (
    <DarkStage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 26 }}>
            {ring > 0 && ring < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  width: 460,
                  height: 460,
                  marginTop: -230,
                  marginLeft: -160,
                  borderRadius: "50%",
                  border: `2.5px solid ${colors.pink}`,
                  opacity: (1 - ring) * 0.8,
                  transform: `scale(${0.25 + ring * 1.35})`,
                }}
              />
            )}
            <div style={{ transform: `scale(${logoIn}) rotate(${(1 - logoIn) * -18}deg)` }}>
              <LogoBadge size={132} />
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 900,
                fontSize: 140,
                letterSpacing: -5,
                color: colors.white,
                transform: `translateX(${interpolate(wordIn, [0, 1], [-40, 0])}px)`,
                opacity: Math.min(1, wordIn * 1.6),
              }}
            >
              PopUp
            </div>
          </div>
          <KineticWord delay={22} size={62} weight={700} color="rgba(255,255,255,0.88)">
            Start your drop on PopUp.
          </KineticWord>
          <div
            style={{
              transform: `scale(${ctaIn * breathe})`,
              background: `linear-gradient(180deg, ${colors.pink}, ${colors.pinkDeep})`,
              borderRadius: 999,
              padding: "26px 74px",
              fontFamily: fonts.sans,
              fontWeight: 800,
              fontSize: 38,
              color: colors.white,
              boxShadow: glow(colors.pink, glowBreathe),
            }}
          >
            Create your shop
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontWeight: 500,
              fontSize: 24,
              letterSpacing: 5,
              color: "rgba(255,255,255,0.45)",
              opacity: Math.min(1, urlIn * 1.5),
              transform: `translateY(${interpolate(urlIn, [0, 1], [24, 0])}px)`,
              marginTop: 4,
            }}
          >
            popupdrop.co
          </div>
        </div>
      </AbsoluteFill>
      <Grain />
    </DarkStage>
  );
};
