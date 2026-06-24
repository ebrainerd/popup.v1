import { describe, expect, it, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";

function cronRequest(secret?: string) {
  const url = secret
    ? `http://localhost:3000/api/cron/release-funds?secret=${secret}`
    : "http://localhost:3000/api/cron/release-funds";
  return new NextRequest(url);
}

describe("verifyCronRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed in production when CRON_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronRequest(cronRequest());
    expect(res?.status).toBe(500);
  });

  it("returns 401 for wrong secret when configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "good-secret");
    const res = verifyCronRequest(cronRequest("bad-secret"));
    expect(res?.status).toBe(401);
  });

  it("allows matching secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "good-secret");
    const res = verifyCronRequest(cronRequest("good-secret"));
    expect(res).toBeNull();
  });

  it("allows unauthenticated local calls when secret unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");
    const res = verifyCronRequest(cronRequest());
    expect(res).toBeNull();
  });
});
