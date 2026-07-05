import { continueRender, delayRender, staticFile } from "remotion";

const load = (family: string, file: string, weight: string) => {
  const font = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {
    weight,
  });
  const handle = delayRender(`font ${family} ${weight}`);
  font
    .load()
    .then(() => {
      document.fonts.add(font);
      continueRender(handle);
    })
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};

export const loadFonts = () => {
  load("Geist Sans", "fonts/geist-sans/Geist-Regular.woff2", "400");
  load("Geist Sans", "fonts/geist-sans/Geist-Medium.woff2", "500");
  load("Geist Sans", "fonts/geist-sans/Geist-SemiBold.woff2", "600");
  load("Geist Sans", "fonts/geist-sans/Geist-Bold.woff2", "700");
  // No non-italic ExtraBold ships with geist; Black covers 800-900.
  load("Geist Sans", "fonts/geist-sans/Geist-Black.woff2", "800 900");
  load("Geist Mono", "fonts/geist-mono/GeistMono-Medium.woff2", "500");
  load("Geist Mono", "fonts/geist-mono/GeistMono-Bold.woff2", "700");
};
