import { afterEach, describe, expect, it, vi } from "vitest";
import { bestEffortPost } from "@/lib/best-effort-fetch";

describe("bestEffortPost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true on ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
    await expect(bestEffortPost("/api/example")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/example", {
      method: "POST",
      keepalive: true,
    });
  });

  it("returns false on HTTP error without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(bestEffortPost("/api/example")).resolves.toBe(false);
  });

  it("swallows Safari-style network TypeErrors (Load failed)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Load failed")),
    );
    await expect(bestEffortPost("/api/example")).resolves.toBe(false);
  });
});
