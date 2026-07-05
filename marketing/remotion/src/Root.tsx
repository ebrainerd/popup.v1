import { Composition } from "remotion";
import { PopUpDemo, TOTAL_FRAMES } from "./PopUpDemo";

export const Root = () => {
  return (
    <Composition
      id="PopUpDemo"
      component={PopUpDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
