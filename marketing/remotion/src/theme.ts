/** PopUp brand tokens, mirrored from src/app/globals.css in the main app. */

export const colors = {
  bg: "#0f0f14",
  bgDeep: "#0a0a0e",
  card: "#1a1a22",
  cardBorder: "#2a2a36",
  pink: "#ff3b8b",
  pinkDeep: "#e6007a",
  teal: "#00e6c8",
  gold: "#ffd60a",
  cream: "#f5f5f7",
  creamWarm: "#f7ede8",
  ink: "#0f0f14",
  white: "#ffffff",
  mutedDark: "#a1a1aa",
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
