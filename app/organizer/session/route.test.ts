import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createOrganizerSessionToken: vi.fn(),
  recordOrganizerUnlockAttempt: vi.fn(),
  OrganizerRateLimitError: class OrganizerRateLimitError extends Error {},
}));

vi.mock("@/lib/auth/environment", () => ({
  getOrganizerEnvironment: () => ({
    ORGANIZER_PIN: "court-2026",
    ORGANIZER_COOKIE_SECRET: "organizer-cookie-secret-for-tests",
  }),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  OrganizerRateLimitError: mocks.OrganizerRateLimitError,
  recordOrganizerUnlockAttempt: mocks.recordOrganizerUnlockAttempt,
}));

vi.mock("@/lib/auth/request", () => ({
  getPrivateUnlockClientKey: () => "a".repeat(64),
  // Mirrors the real check, which trusts the request host rather than the
  // internal request URL.
  hasSameMutationOrigin: (request: Request) => {
    const requestUrl = new URL(request.url);
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const expected = host
      ? new URL(`${requestUrl.protocol}//${host}`).origin
      : requestUrl.origin;

    return request.headers.get("origin") === expected;
  },
}));

vi.mock("@/lib/auth/session", () => ({
  createOrganizerSessionToken: mocks.createOrganizerSessionToken,
  ORGANIZER_COOKIE_NAME: "mgo_organizer",
  organizerCookieOptions: (secure?: boolean) => ({
    httpOnly: true,
    secure: secure ?? true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 604800,
  }),
  pinMatches: (candidate: string, configured: string) =>
    candidate === configured,
}));

import { OrganizerRateLimitError } from "@/lib/auth/rate-limit";
import { POST } from "./route";

function loopbackSessionRequest(
  fields: Record<string, string>,
): NextRequest {
  return new NextRequest("http://localhost:3100/organizer/session", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3100",
      origin: "http://127.0.0.1:3100",
      "x-forwarded-for": "203.0.113.10",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}

function sessionRequest(
  fields: Record<string, string>,
  origin = "https://mcgraw.example",
): NextRequest {
  return new NextRequest("https://mcgraw.example/organizer/session", {
    method: "POST",
    headers: {
      host: "mcgraw.example",
      origin,
      "x-vercel-forwarded-for": "192.0.2.10",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createOrganizerSessionToken.mockResolvedValue("signed-session-token");
  mocks.recordOrganizerUnlockAttempt.mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 0,
  });
});

describe("organizer session route", () => {
  it("rejects cross-origin requests before checking the PIN", async () => {
    const response = await POST(
      sessionRequest(
        { intent: "unlock", pin: "court-2026", returnTo: "/matches" },
        "https://attacker.example",
      ),
    );

    expect(response.status).toBe(403);
    expect(mocks.recordOrganizerUnlockAttempt).not.toHaveBeenCalled();
  });

  it("returns a generic error for a wrong PIN without setting a cookie", async () => {
    const response = await POST(
      sessionRequest({
        intent: "unlock",
        pin: "wrong-pin",
        returnTo: "/matches",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=invalid");
    expect(response.headers.get("location")).not.toContain("wrong-pin");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.recordOrganizerUnlockAttempt).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]{64}$/),
      false,
    );
  });

  it("sets a secure seven-day HttpOnly organizer cookie for the correct PIN", async () => {
    const response = await POST(
      sessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/matches",
      }),
    );
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://mcgraw.example/matches",
    );
    expect(cookie).toContain("mgo_organizer=signed-session-token");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).not.toContain("court-2026");
  });

  it("returns a controlled rate-limit response without setting a cookie", async () => {
    mocks.recordOrganizerUnlockAttempt.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 611,
    });

    const response = await POST(
      sessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/matches",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=limited");
    expect(response.headers.get("location")).toContain("retry=611");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("surfaces a limiter outage as an unavailable state", async () => {
    mocks.recordOrganizerUnlockAttempt.mockRejectedValue(
      new OrganizerRateLimitError(),
    );

    const response = await POST(
      sessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/matches",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=unavailable");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("expires the organizer cookie without calling the limiter", async () => {
    const response = await POST(
      sessionRequest({ intent: "lock", returnTo: "/" }),
    );
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(303);
    expect(cookie).toContain("mgo_organizer=");
    expect(cookie).toContain("Max-Age=0");
    expect(mocks.recordOrganizerUnlockAttempt).not.toHaveBeenCalled();
  });

  it("redirects to the requested host so the cookie survives the redirect", async () => {
    const response = await POST(
      loopbackSessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/matches",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3100/matches",
    );
  });

  it("omits Secure only for a loopback HTTP origin", async () => {
    const loopback = await POST(
      loopbackSessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/matches",
      }),
    );

    expect(loopback.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("keeps Secure for a non-loopback HTTP origin", async () => {
    const request = new NextRequest(
      "http://mcgraw.example/organizer/session",
      {
        method: "POST",
        headers: {
          host: "mcgraw.example",
          origin: "http://mcgraw.example",
          "x-forwarded-for": "203.0.113.10",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          intent: "unlock",
          pin: "court-2026",
          returnTo: "/matches",
        }),
      },
    );

    expect((await POST(request)).headers.get("set-cookie")).toContain("Secure");
  });

  it("prevents return paths from becoming cross-origin redirects", async () => {
    const response = await POST(
      sessionRequest({
        intent: "unlock",
        pin: "court-2026",
        returnTo: "/\\attacker.example",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://mcgraw.example/matches",
    );
  });
});
