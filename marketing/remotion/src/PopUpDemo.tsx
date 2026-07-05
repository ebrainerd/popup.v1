import React from "react";
import { getStaticFiles } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFonts } from "./fonts";
import { colors } from "./theme";
import { Hook } from "./scenes/Hook";
import { Broll } from "./scenes/Broll";
import { ProductCascade } from "./scenes/ProductCascade";
import { BuyerPov } from "./scenes/BuyerPov";
import { Scarcity } from "./scenes/Scarcity";
import { SellerPayoff } from "./scenes/SellerPayoff";
import { Outro } from "./scenes/Outro";

loadFonts();

const T = 8; // transition length (frames) — fast cuts
const SCENES = [100, 145, 150, 185, 135, 90, 155, 100, 130];
export const TOTAL_FRAMES = SCENES.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);

/** Use the Veo clip when it has been generated, else animate the source still. */
const clipOrFallback = (name: string): string => {
  const files = getStaticFiles();
  return files.some((f) => f.name === `broll/${name}.mp4`) ? `broll/${name}.mp4` : "";
};

export const PopUpDemo: React.FC = () => {
  const cut = (
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
  );
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES[0]}>
        <Hook />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[1]}>
        <Broll
          clip={clipOrFallback("wheel")}
          fallbackImage="demo/stream.jpg"
          words={["Made by hand.", "Sold live."]}
          accent={colors.pink}
        />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[2]}>
        <ProductCascade />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[3]}>
        <BuyerPov />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[4]}>
        <Scarcity />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[5]}>
        <Broll
          clip={clipOrFallback("bowls")}
          fallbackImage="demo/bowl.jpg"
          words={["Small batches.", "Big demand."]}
          accent={colors.teal}
          wordDelay={8}
        />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[6]}>
        <SellerPayoff />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[7]}>
        <Broll
          clip={clipOrFallback("mug")}
          fallbackImage="demo/ring-dish.jpg"
          words={["Your craft,", "in their hands."]}
          accent={colors.pink}
          wordDelay={8}
        />
      </TransitionSeries.Sequence>
      {cut}
      <TransitionSeries.Sequence durationInFrames={SCENES[8]}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
