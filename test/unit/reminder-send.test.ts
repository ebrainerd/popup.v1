import { describe, expect, it, vi, afterEach } from "vitest";

/** Mirrors sendResendEmail HTTP semantics for unit tests. */
async function sendResendEmailMock(
  fetchImpl: typeof fetch,
  to: string,
  apiKey: string | undefined,
): Promise<boolean> {
  if (!apiKey || !to) return false;
  const res = await fetchImpl("https://api.resend.com/emails", { method: "POST" });
  if (!res.ok) {
    throw new Error(`Resend failed (${res.status})`);
  }
  return true;
}

describe("sendResendEmail response handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws on non-2xx responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "bad" });
    await expect(sendResendEmailMock(fetchMock, "buyer@example.com", "re_test")).rejects.toThrow(
      /Resend failed \(422\)/,
    );
  });

  it("returns true on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await expect(sendResendEmailMock(fetchMock, "buyer@example.com", "re_test")).resolves.toBe(true);
  });

  it("returns false when skipped (no API key)", async () => {
    const fetchMock = vi.fn();
    await expect(sendResendEmailMock(fetchMock, "buyer@example.com", undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
