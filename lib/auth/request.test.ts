import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { OrganizerEnvironment } from "./environment";
import {
  getPrivateUnlockClientKey,
  hasSameMutationOrigin,
  requireOrganizerMutation,
} from "./request";
import { createOrganizerSessionToken } from "./session";

const environment: OrganizerEnvironment = {
  ORGANIZER_PIN: "court-2026",
  ORGANIZER_COOKIE_SECRET: "organizer-cookie-secret-for-tests",
};

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("organizer request security", () => {
  it("accepts the exact request origin", () => {
    const request = new Request("https://mcgraw.example/organizer/session", {
      method: "POST",
      headers: {
        host: "mcgraw.example",
        origin: "https://mcgraw.example",
      },
    });

    expect(hasSameMutationOrigin(request)).toBe(true);
  });

  it("rejects missing and cross-origin mutation origins", () => {
    const missingOrigin = new Request(
      "https://mcgraw.example/organizer/session",
      { method: "POST", headers: { host: "mcgraw.example" } },
    );
    const crossOrigin = new Request(
      "https://mcgraw.example/organizer/session",
      {
        method: "POST",
        headers: {
          host: "mcgraw.example",
          origin: "https://attacker.example",
        },
      },
    );

    expect(hasSameMutationOrigin(missingOrigin)).toBe(false);
    expect(hasSameMutationOrigin(crossOrigin)).toBe(false);
  });

  it("creates stable, private, per-client limiter keys", () => {
    const firstRequest = new Request("https://mcgraw.example", {
      headers: { "x-vercel-forwarded-for": "192.0.2.1" },
    });
    const secondRequest = new Request("https://mcgraw.example", {
      headers: { "x-vercel-forwarded-for": "192.0.2.2" },
    });
    const firstKey = getPrivateUnlockClientKey(firstRequest, environment);

    expect(firstKey).toMatch(/^[0-9a-f]{64}$/);
    expect(firstKey).not.toContain("192.0.2.1");
    expect(getPrivateUnlockClientKey(firstRequest, environment)).toBe(firstKey);
    expect(getPrivateUnlockClientKey(secondRequest, environment)).not.toBe(
      firstKey,
    );
  });

  it("requires both a same-origin request and a valid organizer cookie", async () => {
    process.env.ORGANIZER_PIN = environment.ORGANIZER_PIN;
    process.env.ORGANIZER_COOKIE_SECRET =
      environment.ORGANIZER_COOKIE_SECRET;
    const token = await createOrganizerSessionToken(environment);
    const authorizedRequest = new NextRequest(
      "https://mcgraw.example/matches/update",
      {
        method: "POST",
        headers: {
          cookie: `mgo_organizer=${token}`,
          host: "mcgraw.example",
          origin: "https://mcgraw.example",
        },
      },
    );
    const unauthorizedRequest = new NextRequest(
      "https://mcgraw.example/matches/update",
      {
        method: "POST",
        headers: {
          host: "mcgraw.example",
          origin: "https://mcgraw.example",
        },
      },
    );

    await expect(
      requireOrganizerMutation(authorizedRequest),
    ).resolves.toBeUndefined();
    await expect(
      requireOrganizerMutation(unauthorizedRequest),
    ).rejects.toThrow("Organizer authorization is required.");
  });
});
