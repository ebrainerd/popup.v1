import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, glow } from "../theme";
import { Card, DarkStage, Grain, POP, SNAP, useSpring } from "../components/shared";

const TICKS = [
  { at: 14, label: "3 left" },
  { at: 40, label: "2 left" },
  { at: 66, label: "1 left" },
];
const SOLD_AT = 92;

const TickNumber: React.FC<{ label: string; at: number; retireAt: number }> = ({ label, at, retireAt }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(at, POP);
  const leaving = frame >= retireAt;
  const leaveT = interpolate(frame, [retireAt, retireAt + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${leaving ? -90 * leaveT : interpolate(enter, [0, 1], [90, 0])}px) scale(${leaving ? 1 - leaveT * 0.3 : 0.7 + enter * 0.3})`,
        opacity: leaving ? 1 - leaveT : Math.min(1, enter * 1.8),
        filter: `blur(${leaving ? leaveT * 8 : 0}px)`,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: 130,
        letterSpacing: -3,
        color: colors.white,
      }}
    >
      {label}
    </div>
  );
};

/**
 * Scene 5 — scarcity: the inventory counter ticks down 3 → 2 → 1 with punchy
 * flips, then a huge SOLD OUT stamp slams down over the product card.
 */
export const Scarcity: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const cardIn = useSpring(0, SNAP);
  const stamp = useSpring(SOLD_AT, { damping: 13, mass: 0.8, stiffness: 240 });
  const shake = frame >= SOLD_AT && frame < SOLD_AT + 10 ? Math.sin(frame * 3.1) * (SOLD_AT + 10 - frame) * 1.15 : 0;
  const flash = interpolate(frame, [SOLD_AT, SOLD_AT + 3, SOLD_AT + 14], [0, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // pulse on each tick
  const tickPulse = TICKS.reduce((acc, t) => {
    const p = interpolate(frame, [t.at, t.at + 3, t.at + 12], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.max(acc, p);
  }, 0);

  const outStart = durationInFrames - 12;
  const outT = interpolate(frame, [outStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <DarkStage accent={colors.pink} vignette={0.92}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${shake}px, ${shake * 0.6}px) scale(${1 + outT * outT * 1.9})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 90,
            alignItems: "center",
            transform: `translateY(${interpolate(cardIn, [0, 1], [500, 0])}px)`,
            opacity: Math.min(1, cardIn * 1.6),
          }}
        >
          {/* Product card that gets stamped */}
          <div style={{ position: "relative", transform: `rotate(-2.6deg)` }}>
            <Card style={{ width: 470 }}>
              <div style={{ height: 330, overflow: "hidden", position: "relative" }}>
                <Img
                  src={staticFile("demo/limited-vase.jpg")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: frame >= SOLD_AT ? "saturate(0.35) brightness(0.75)" : undefined,
                  }}
                />
              </div>
              <div style={{ padding: "26px 30px" }}>
                <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 32, color: colors.white }}>
                  Limited Kiln Vase
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <div style={{ fontFamily: fonts.sans, fontWeight: 800, fontSize: 36, color: colors.white }}>$120</div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontWeight: 700,
                      fontSize: 21,
                      color: colors.gold,
                      background: "#2a220633",
                      border: `1.5px solid ${colors.gold}55`,
                      padding: "8px 18px",
                      borderRadius: 999,
                      boxShadow: `0 0 ${18 + tickPulse * 26}px ${colors.gold}${tickPulse > 0.3 ? "88" : "33"}`,
                    }}
                  >
                    ONE OF ONE
                  </div>
                </div>
              </div>
            </Card>
            {/* SOLD OUT stamp */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${interpolate(stamp, [0, 1], [3.2, 1])}) rotate(-11deg)`,
                opacity: Math.min(1, stamp * 2),
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontWeight: 900,
                  fontSize: 68,
                  letterSpacing: 2,
                  whiteSpace: "nowrap",
                  color: colors.pink,
                  border: `7px solid ${colors.pink}`,
                  borderRadius: 22,
                  padding: "10px 34px",
                  textShadow: glow(colors.pink, 0.9),
                  boxShadow: `${glow(colors.pink, 0.7)}, inset 0 0 40px ${colors.pink}22`,
                  background: "rgba(15,15,20,0.55)",
                  backdropFilter: "blur(4px)",
                }}
              >
                SOLD OUT
              </div>
            </div>
          </div>

          {/* Counter panel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: 6,
                color: colors.mutedDark,
              }}
            >
              INVENTORY
            </div>
            <div style={{ position: "relative", width: 560, height: 190 }}>
              {TICKS.map((t, i) => (
                <TickNumber key={t.label} label={t.label} at={t.at} retireAt={i < TICKS.length - 1 ? TICKS[i + 1].at : SOLD_AT} />
              ))}
              {/* final state */}
              {frame >= SOLD_AT && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${0.7 + Math.min(1, stamp) * 0.3})`,
                    fontFamily: fonts.mono,
                    fontWeight: 700,
                    fontSize: 130,
                    letterSpacing: -3,
                    color: colors.pink,
                    textShadow: glow(colors.pink, 0.8),
                  }}
                >
                  0 left
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 24,
                color: colors.mutedDark,
                opacity: interpolate(frame, [SOLD_AT + 8, SOLD_AT + 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Gone in <span style={{ color: colors.white, fontWeight: 700 }}>4 minutes</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* stamp impact flash */}
      <AbsoluteFill style={{ background: colors.pink, opacity: flash * 0.35, pointerEvents: "none" }} />
      <Grain />
    </DarkStage>
  );
};
