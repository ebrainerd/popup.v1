/** PopUp brand tokens, mirrored from src/app/globals.css in the main app. */

export const colors = {
  bg: "#12110f",
  bgDeep: "#0d0c0a",
  card: "#1a1815",
  cardBorder: "#2f2b25",
  pink: "#ff5c1a",
  pinkDeep: "#e04e10",
  teal: "#2db8a8",
  gold: "#f5c518",
  cream: "#f7f3ec",
  creamWarm: "#faf8f4",
  ink: "#12110f",
  white: "#ffffff",
  mutedDark: "#a39e94",
  mutedLight: "#5c5c66",
} as const;

export const fonts = {
  sans: "'Geist Sans', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
} as const;

export const glow = (color: string, strength = 1) =>
  [
    `0 0 ${18 * strength}px ${color}66`,
    `0 0 ${48 * strength}px ${color}40`,
    `0 0 ${110 * strength}px ${color}26`,
  ].join(", ");
