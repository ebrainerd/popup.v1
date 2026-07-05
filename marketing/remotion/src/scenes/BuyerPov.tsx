import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, glow } from "../theme";
import { Card, DarkStage, Grain, LiveBadge, POP, SNAP, useSpring, useCountUp } from "../components/shared";

const CHAT = [
  { user: "jordan.k", text: "that glaze 😍😍", color: "#8ab4ff" },
  { user: "sam.creates", text: "how many planters left?", color: "#ffd60a" },
  { user: "maya.clay", text: "3 planters left — go go go!", color: colors.pink, seller: true },
  { user: "kai.collects", text: "GOT ONE 🔥", color: colors.teal },
];

const CHAT_START = 26;
const CHAT_GAP = 16;
const CLICK_AT = 118; // frame where the buy button is pressed

const ChatBubble: React.FC<{ msg: (typeof CHAT)[number]; delay: number }> = ({ msg, delay }) => {
  const enter = useSpring(delay, POP);
  return (
    <div
      style={{
        transform: `translateY(${interpolate(enter, [0, 1], [46, 0])}px) scale(${0.7 + enter * 0.3})`,
        transformOrigin: "0% 100%",
        opacity: Math.min(1, enter * 1.7),
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        background: msg.seller ? `${colors.pink}1f` : "rgba(255,255,255,0.055)",
        border: `1.5px solid ${msg.seller ? `${colors.pink}66` : "rgba(255,255,255,0.09)"}`,
        borderRadius: 20,
        padding: "16px 22px",
        width: "fit-content",
        maxWidth: 560,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          background: `linear-gradient(135deg, ${msg.color}, ${msg.color}77)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.sans,
          fontWeight: 800,
          fontSize: 20,
          color: "#0f0f14",
        }}
      >
        {msg.user[0].toUpperCase()}
      </div>
      <div>
        <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 22, color: msg.color }}>{msg.user}</span>
        <span style={{ fontFamily: fonts.sans, fontSize: 23, color: "rgba(255,255,255,0.92)", marginLeft: 12 }}>
          {msg.text}
        </span>
      </div>
    </div>
  );
};

/**
 * Scene 4 — buyer POV: live stream card + chat bubbles popping in, then the
 * "Buy now" button compresses, flashes, and fires a shockwave ring;
 * an "Order confirmed" chip pops. Ends zooming through the confirmation.
 */
export const BuyerPov: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const streamIn = useSpring(2, SNAP);
  const panelIn = useSpring(10, SNAP);
  const viewers = Math.round(useCountUp(6, 96, 128, 100));

  // Buy button interaction
  const press = interpolate(frame, [CLICK_AT, CLICK_AT + 4, CLICK_AT + 9], [1, 0.86, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const settle = useSpring(CLICK_AT + 9, POP);
  const btnScale = frame < CLICK_AT + 9 ? press : 1.04 - (1.04 - 1) * settle;
  const flash = interpolate(frame, [CLICK_AT, CLICK_AT + 3, CLICK_AT + 16], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = interpolate(frame, [CLICK_AT + 2, CLICK_AT + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const confirmIn = useSpring(CLICK_AT + 14, POP);

  // Cursor travels to the button, then presses
  const cursorX = interpolate(frame, [CLICK_AT - 40, CLICK_AT - 4], [340, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [CLICK_AT - 40, CLICK_AT - 4], [260, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit: zoom through the confirmed chip
  const outStart = durationInFrames - 14;
  const t = interpolate(frame, [outStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = 1 + t * t * 3.6;

  return (
    <DarkStage accent={colors.teal}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "72% 63%" }}>
        {/* Stream card, floating left */}
        <div
          style={{
            position: "absolute",
            left: 120,
            top: 150,
            transform: `translateY(${interpolate(streamIn, [0, 1], [420, 0]) + Math.sin(frame / 30) * 6}px) rotate(${-2.4 + streamIn * 1.2}deg)`,
            opacity: Math.min(1, streamIn * 1.6),
          }}
        >
          <Card style={{ width: 950, position: "relative" }}>
            <div style={{ height: 560, position: "relative", overflow: "hidden" }}>
              <Img
                src={staticFile("demo/stream.jpg")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${1.05 + frame * 0.0006})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(0deg, rgba(10,10,14,0.6) 0%, transparent 35%)",
                }}
              />
              <div style={{ position: "absolute", top: 26, left: 28 }}>
                <LiveBadge delay={8} />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 30,
                  right: 30,
                  fontFamily: fonts.mono,
                  fontWeight: 700,
                  fontSize: 24,
                  color: colors.white,
                  background: "rgba(10,10,14,0.65)",
                  border: "1.5px solid rgba(255,255,255,0.14)",
                  padding: "10px 20px",
                  borderRadius: 999,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.teal, boxShadow: `0 0 12px ${colors.teal}` }} />
                {viewers} watching
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: 30,
                  fontFamily: fonts.sans,
                  fontWeight: 800,
                  fontSize: 34,
                  color: colors.white,
                  textShadow: "0 4px 24px rgba(0,0,0,0.8)",
                }}
              >
                Spring Studio Drop
              </div>
            </div>
          </Card>
        </div>

        {/* Chat stack, floating right-top */}
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 128,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transform: `translateY(${interpolate(panelIn, [0, 1], [300, 0])}px)`,
            opacity: Math.min(1, panelIn * 1.6),
          }}
        >
          {CHAT.map((m, i) => (
            <ChatBubble key={m.user} msg={m} delay={CHAT_START + i * CHAT_GAP} />
          ))}
        </div>

        {/* Buy card, bottom right */}
        <div
          style={{
            position: "absolute",
            right: 150,
            bottom: 96,
            transform: `translateY(${interpolate(panelIn, [0, 1], [340, 0]) + Math.sin(frame / 34 + 2) * 5}px) rotate(${1.8 - panelIn * 0.9}deg)`,
            opacity: Math.min(1, panelIn * 1.6),
          }}
        >
          <Card style={{ width: 560, padding: "30px 34px", position: "relative", overflow: "visible" }}>
            <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
              <Img
                src={staticFile("demo/planter.jpg")}
                style={{ width: 108, height: 108, borderRadius: 18, objectFit: "cover" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 28, color: colors.white }}>
                  Studio Planter
                </div>
                <div style={{ fontFamily: fonts.sans, fontSize: 20, color: colors.mutedDark, marginTop: 4 }}>
                  $52 · Free shipping
                </div>
              </div>
            </div>
            <div style={{ position: "relative", marginTop: 26 }}>
              {/* shockwave ring */}
              {ring > 0 && ring < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 320,
                    height: 320,
                    marginLeft: -160,
                    marginTop: -160,
                    borderRadius: "50%",
                    border: `3px solid ${colors.pink}`,
                    opacity: 1 - ring,
                    transform: `scale(${0.35 + ring * 1.5})`,
                    pointerEvents: "none",
                  }}
                />
              )}
              <div
                style={{
                  transform: `scale(${btnScale})`,
                  background: `linear-gradient(180deg, ${colors.pink}, ${colors.pinkDeep})`,
                  borderRadius: 999,
                  padding: "22px 0",
                  textAlign: "center",
                  fontFamily: fonts.sans,
                  fontWeight: 800,
                  fontSize: 30,
                  color: colors.white,
                  boxShadow: glow(colors.pink, 0.6 + flash * 1.6),
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: colors.white,
                    opacity: flash * 0.55,
                  }}
                />
                Buy now
              </div>
              {/* cursor */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "58%",
                  transform: `translate(${cursorX}px, ${cursorY}px) scale(${frame >= CLICK_AT && frame < CLICK_AT + 6 ? 0.82 : 1})`,
                  opacity: interpolate(frame, [CLICK_AT - 44, CLICK_AT - 36, CLICK_AT + 12, CLICK_AT + 20], [0, 1, 1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  fontSize: 46,
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.7))",
                }}
              >
                <svg width="42" height="46" viewBox="0 0 24 26">
                  <path
                    d="M4 1 L4 19 L9 15 L12 23 L15.5 21.5 L12.5 14 L19 13.5 Z"
                    fill="#fff"
                    stroke="#0f0f14"
                    strokeWidth="1.4"
                  />
                </svg>
              </div>
            </div>
            {/* Order confirmed chip */}
            <div
              style={{
                position: "absolute",
                top: -34,
                right: -30,
                transform: `scale(${confirmIn}) rotate(${6 - confirmIn * 4}deg)`,
                background: colors.teal,
                color: "#06231f",
                fontFamily: fonts.sans,
                fontWeight: 800,
                fontSize: 25,
                padding: "14px 26px",
                borderRadius: 999,
                boxShadow: glow(colors.teal, 0.8),
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              ✓ Order confirmed
            </div>
          </Card>
        </div>
      </AbsoluteFill>
      <Grain />
    </DarkStage>
  );
};
