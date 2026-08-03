import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseUnlockRateLimitResult } from "./rate-limit";

describe("unlock rate-limit responses", () => {
  it("normalizes the reviewed RPC result", () => {
    expect(
      parseUnlockRateLimitResult([
        { allowed: false, retry_after_seconds: 734 },
      ]),
    ).toEqual({
      allowed: false,
      retryAfterSeconds: 734,
    });
  });

  it("rejects missing, duplicate, and invalid RPC rows", () => {
    expect(() => parseUnlockRateLimitResult([])).toThrow();
    expect(() =>
      parseUnlockRateLimitResult([
        { allowed: true, retry_after_seconds: 0 },
        { allowed: true, retry_after_seconds: 0 },
      ]),
    ).toThrow();
    expect(() =>
      parseUnlockRateLimitResult([
        { allowed: false, retry_after_seconds: 901 },
      ]),
    ).toThrow();
  });
});
