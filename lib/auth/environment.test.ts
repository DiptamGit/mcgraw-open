import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("organizer environment validation", () => {
  it("requires the PIN and a strong cookie secret without exposing values", async () => {
    process.env.ORGANIZER_PIN = "123";
    process.env.ORGANIZER_COOKIE_SECRET = "short";

    const { getOrganizerEnvironment } = await import("./environment");

    expect(() => getOrganizerEnvironment()).toThrow(
      "Invalid organizer configuration: ORGANIZER_PIN, ORGANIZER_COOKIE_SECRET are missing or invalid.",
    );
  });

  it("returns valid server-only organizer settings", async () => {
    process.env.ORGANIZER_PIN = "court-2026";
    process.env.ORGANIZER_COOKIE_SECRET = "a".repeat(32);

    const { getOrganizerEnvironment } = await import("./environment");

    expect(getOrganizerEnvironment()).toEqual({
      ORGANIZER_PIN: "court-2026",
      ORGANIZER_COOKIE_SECRET: "a".repeat(32),
    });
  });
});
