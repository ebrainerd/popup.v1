import { describe, expect, it, afterEach } from "vitest";
import { getDiscoveryMode, isInviteOnlyMode, isMarketplaceMode } from "@/lib/discovery";

describe("discovery mode", () => {
  const original = process.env.NEXT_PUBLIC_DISCOVERY_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DISCOVERY_MODE;
    else process.env.NEXT_PUBLIC_DISCOVERY_MODE = original;
  });

  it("defaults to invite_only", () => {
    delete process.env.NEXT_PUBLIC_DISCOVERY_MODE;
    expect(getDiscoveryMode()).toBe("invite_only");
    expect(isInviteOnlyMode()).toBe(true);
    expect(isMarketplaceMode()).toBe(false);
  });

  it("supports marketplace mode", () => {
    process.env.NEXT_PUBLIC_DISCOVERY_MODE = "marketplace";
    expect(getDiscoveryMode()).toBe("marketplace");
    expect(isMarketplaceMode()).toBe(true);
  });
});
