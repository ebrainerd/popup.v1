import localFont from "next/font/local";

/** Syne ExtraBold — logo / wordmark only (not general UI). */
export const syne = localFont({
  src: [{ path: "../fonts/syne-latin-800-normal.woff2", weight: "800", style: "normal" }],
  variable: "--font-syne",
  display: "swap",
});
