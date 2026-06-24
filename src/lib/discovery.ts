export type DiscoveryMode = "invite_only" | "marketplace";

/** Launch/discovery mode. Defaults to invite-only (seller-led, link sharing). */
export function getDiscoveryMode(): DiscoveryMode {
  const raw = process.env.NEXT_PUBLIC_DISCOVERY_MODE?.trim().toLowerCase();
  if (raw === "marketplace") return "marketplace";
  return "invite_only";
}

export function isInviteOnlyMode(): boolean {
  return getDiscoveryMode() === "invite_only";
}

export function isMarketplaceMode(): boolean {
  return getDiscoveryMode() === "marketplace";
}

/** In invite-only launch, all shops are link-only (private). */
export function resolveShopVisibility(requested: "public" | "private"): "public" | "private" {
  return isInviteOnlyMode() ? "private" : requested;
}
