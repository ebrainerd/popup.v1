import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, glow } from "../theme";
import { Card, DarkStage, Grain, KineticWord, POP, SNAP, Sfx, useSpring } from "../components/shared";

const PRODUCTS = [
  { img: "demo/mug.jpg", name: "Speckled Mug", price: "$42", meta: "16oz wheel-thrown", tilt: -7, y: 40 },
  { img: "demo/bowl.jpg", name: "Ocean Glaze Bowl", price: "$68", meta: "Layered blue-green glaze", tilt: -2.5, y: -26 },
  { img: "demo/vase.jpg", name: "Mini Vase Set (3)", price: "$55", meta: "Perfect shelfie trio", tilt: 3, y: 22 },
  { img: "demo/ring-dish.jpg", name: "Sunset Ring Dish", price: "$38", meta: "Hand-painted florals", tilt: 7.5, y: -14 },
];

const ProductCard: React.FC<{ p: (typeof PRODUCTS)[number]; delay: number; focus?: boolean }> = ({
  p,
  delay,
  focus,
}) => {
  const frame = useCurrentFrame();
  const enter = useSpring(delay, SNAP);
  const chipIn = useSpring(delay + 10, POP);
  const float = Math.sin((frame - delay) / 26 + p.tilt) * 7;
  return (
    <div
      style={{
        transform: `translateY(${interpolate(enter, [0, 1], [560, p.y]) + float}px) rotate(${p.tilt * (1.35 - enter * 0.35)}deg) scale(${0.82 + enter * 0.18})`,
        opacity: Math.min(1, enter * 1.8),
      }}
    >
      <Card style={{ width: 368, position: "relative" }}>
        <div style={{ height: 268, overflow: "hidden", position: "relative" }}>
          <Img src={staticFile(p.img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(0deg, rgba(15,15,20,0.55) 0%, transparent 40%)",
            }}
          />
        </div>
        <div style={{ padding: "24px 26px 26px" }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 29, color: colors.white }}>{p.name}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 19, color: colors.mutedDark, marginTop: 5 }}>{p.meta}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
            <div style={{ fontFamily: fonts.sans, fontWeight: 800, fontSize: 34, color: colors.white }}>{p.price}</div>
            <div
              style={{
                transform: `scale(${chipIn})`,
                padding: "11px 26px",
                borderRadius: 999,
                background: colors.pink,
                color: colors.white,
                fontFamily: fonts.sans,
                fontWeight: 700,
                fontSize: 21,
                boxShadow: focus ? glow(colors.pink, 0.9) : `0 6px 22px ${colors.pink}55`,
              }}
            >
              Buy now
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * Scene 3 — floating product cards cascade in with springs; camera pushes
 * through the "Buy now" button of the focus card to cut into the buyer POV.
 */
export const ProductCascade: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Exit: zoom through the 2nd card's Buy button (right-of-center, low).
  const outStart = durationInFrames - 16;
  const t = interpolate(frame, [outStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = 1 + t * t * 4.2;

  return (
    <DarkStage accent={colors.pink}>
      <Sfx src="bass_hit" at={4} />
      <Sfx src="bass_hit" at={14} volume={0.85} rate={1.12} />
      {PRODUCTS.map((_, i) => (
        <Sfx key={i} src="pop" at={16 + i * 8} volume={0.65} rate={0.92 + i * 0.09} />
      ))}
      <Sfx src="whoosh" at={outStart} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "38.5% 78%" }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 92 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
            <KineticWord delay={4} size={104}>
              Drop your
            </KineticWord>
            <KineticWord delay={14} size={104} color={colors.pink} glowColor={colors.pink}>
              collection.
            </KineticWord>
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 34, paddingTop: 170 }}>
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.name} p={p} delay={16 + i * 8} focus={i === 1} />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain />
    </DarkStage>
  );
};
