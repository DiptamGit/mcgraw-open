import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import type { OrganizerEnvironment } from "./environment";
import {
  createOrganizerSessionToken,
  organizerCookieOptions,
  pinMatches,
  verifyOrganizerSessionToken,
} from "./session";

const environment: OrganizerEnvironment = {
  ORGANIZER_PIN: "court-2026",
  ORGANIZER_COOKIE_SECRET: "organizer-cookie-secret-for-tests",
};

describe("organizer sessions", () => {
  it("compares candidate PINs without returning configured data", () => {
    expect(pinMatches("court-2026", environment.ORGANIZER_PIN)).toBe(true);
    expect(pinMatches("wrong-pin", environment.ORGANIZER_PIN)).toBe(false);
  });

  it("signs and verifies an organizer token without embedding the PIN", async () => {
    const token = await createOrganizerSessionToken(environment);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(token).not.toContain(environment.ORGANIZER_PIN);
    expect(JSON.stringify(payload)).not.toContain(environment.ORGANIZER_PIN);
    expect(payload.sub).toBe("organizer");
    expect(Number(payload.exp) - Number(payload.iat)).toBe(604800);
    expect(await verifyOrganizerSessionToken(token, environment)).toBe(true);
  });

  it("invalidates an existing token when the configured PIN changes", async () => {
    const token = await createOrganizerSessionToken(environment);

    expect(
      await verifyOrganizerSessionToken(token, {
        ...environment,
        ORGANIZER_PIN: "rotated-2026",
      }),
    ).toBe(false);
  });

  it("rejects tampered tokens", async () => {
    const token = await createOrganizerSessionToken(environment);
    const [header, payload, signature] = token.split(".");
    const firstSignatureCharacter = signature.slice(0, 1);
    const tamperedToken = [
      header,
      payload,
      `${firstSignatureCharacter === "A" ? "B" : "A"}${signature.slice(1)}`,
    ].join(".");

    expect(
      await verifyOrganizerSessionToken(tamperedToken, environment),
    ).toBe(false);
  });

  it("uses production-safe cookie attributes", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(organizerCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });

    vi.unstubAllEnvs();
  });
});
