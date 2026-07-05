import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Card, CreamStage, Grain, KineticWord, POP, SNAP, Sfx, useSpring, useCountUp } from "../components/shared";

const ORDERS = [
  { id: "#3b57e714", name: "Sunset Ring Dish", buyer: "@kai.collects · Austin, TX", price: "$38.00" },
  { id: "#c052206b", name: "Ocean Glaze Bowl", buyer: "@sam.creates · San Francisco, CA", price: "$74.00" },
  { id: "#1002d22f", name: "Speckled Mug", buyer: "@jordan.k · Portland, OR", price: "$48.00" },
];

const StatCard: React.FC<{
  label: string;
  value: string;
  delay: number;
  accent: string;
  big?: boolean;
}> = ({ label, value, delay, accent, big }) => {
  const enter = useSpring(delay, SNAP);
  return (
    <Card
      light
      style={{
        padding: big ? "40px 52px" : "30px 38px",
        transform: `translateY(${interpolate(enter, [0, 1], [220, 0])}px) scale(${0.86 + enter * 0.14})`,
        opacity: Math.min(1, enter * 1.7),
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: big ? 26 : 21,
          letterSpacing: 2,
          color: "#8a7468",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 900,
          fontSize: big ? 130 : 62,
          letterSpacing: big ? -5 : -2,
          color: colors.ink,
          marginTop: big ? 6 : 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ color: accent === "none" ? colors.ink : accent }}>{value}</span>
      </div>
    </Card>
  );
};

const OrderRow: React.FC<{ order: (typeof ORDERS)[number]; delay: number }> = ({ order, delay }) => {
  const enter = useSpring(delay, SNAP);
  const chip = useSpring(delay + 8, POP);
  return (
    <Card
      light
      style={{
        padding: "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        width: 640,
        transform: `translateX(${interpolate(enter, [0, 1], [420, 0])}px)`,
        opacity: Math.min(1, enter * 1.7),
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 16, color: "#a08b7e" }}>{order.id}</div>
        <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 25, color: colors.ink, marginTop: 2 }}>
          {order.name}
        </div>
        <div style={{ fontFamily: fonts.sans, fontSize: 18, color: "#8a7468", marginTop: 2 }}>{order.buyer}</div>
      </div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 800, fontSize: 28, color: colors.ink }}>{order.price}</div>
      <div
        style={{
          transform: `scale(${chip})`,
          background: colors.teal,
          color: "#06231f",
          fontFamily: fonts.sans,
          fontWeight: 800,
          fontSize: 18,
          padding: "8px 18px",
          borderRadius: 999,
          boxShadow: `0 6px 20px ${colors.teal}66`,
        }}
      >
        Paid
      </div>
    </Card>
  );
};

/**
 * Scene 7 — seller payoff on a light cream stage: gross sales counts up to
 * $468 in a hero stat card while paid orders slide in one by one.
 */
export const SellerPayoff: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const gross = useCountUp(18, 0, 468, 52);
  const sales = Math.round(useCountUp(22, 0, 8, 46));

  const outStart = durationInFrames - 12;
  const outT = interpolate(frame, [outStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <CreamStage>
      <Sfx src="bass_hit" at={6} volume={0.65} rate={1.25} />
      <Sfx src="bass_hit" at={16} volume={0.6} rate={1.4} />
      <Sfx src="cha" at={64} volume={0.75} />
      {ORDERS.map((o, i) => (
        <Sfx key={o.id} src="pop" at={30 + i * 12} volume={0.55} rate={1 + i * 0.07} />
      ))}
      <Sfx src="whoosh" at={durationInFrames - 12} volume={0.85} />
      <AbsoluteFill style={{ transform: `scale(${1 + outT * outT * 1.6})`, transformOrigin: "30% 55%" }}>
        <AbsoluteFill style={{ paddingTop: 84, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
            <KineticWord delay={6} size={92} color={colors.ink}>
              And you got
            </KineticWord>
            <KineticWord delay={16} size={92} color={colors.pinkDeep} glowColor={colors.pink}>
              paid.
            </KineticWord>
          </div>
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 70,
            paddingTop: 130,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <StatCard
              label="Gross sales"
              value={`$${gross.toFixed(2)}`}
              delay={10}
              accent="none"
              big
            />
            <div style={{ display: "flex", gap: 26 }}>
              <StatCard label="Sales" value={String(sales)} delay={18} accent={colors.pinkDeep} />
              <StatCard label="Avg rating" value="4.9★" delay={24} accent="#b8860b" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {ORDERS.map((o, i) => (
              <OrderRow key={o.id} order={o} delay={30 + i * 12} />
            ))}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.035} />
    </CreamStage>
  );
};
