import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  preview: vi.fn(),
  apply: vi.fn(),
  revalidate: vi.fn(),
  Conflict: class ReconciliationConflictError extends Error {},
}));
vi.mock("@/lib/auth/session", () => ({
  ORGANIZER_COOKIE_NAME: "mgo_organizer",
  verifyOrganizerSessionToken: mocks.verify,
}));
vi.mock("@/lib/reconciliation/server", () => ({
  previewKnockoutReconciliation: mocks.preview,
  applyKnockoutReconciliation: mocks.apply,
  ReconciliationConflictError: mocks.Conflict,
}));
vi.mock("@/lib/data/revalidation", () => ({ revalidateTournamentData: mocks.revalidate }));

import { DataLayerError } from "@/lib/data/errors";
import { POST } from "./route";

const snapshot = {
  teams: [], matches: [],
  state: {
    id: 1, group_stage_status: "open", groups_finalized_at: null,
    tie_resolution_note: null, updated_at: "2026-10-15T02:00:00Z",
  },
};
const applyBody = {
  intent: "apply", reconciliationId: "MGO-033",
  confirmation: "Apply the reviewed MGO-033 reconciliation",
  expectedSnapshot: snapshot,
};
function request(body: unknown, origin = "https://mcgraw.example", cookie = true) {
  return new NextRequest("https://mcgraw.example/organizer/reconcile-2026-knockout", {
    method: "POST",
    headers: {
      origin, host: "mcgraw.example", "content-type": "application/json",
      ...(cookie ? { cookie: "mgo_organizer=test-session" } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue(true);
  mocks.preview.mockResolvedValue({ reconciliationId: "MGO-033", expectedSnapshot: snapshot });
  mocks.apply.mockResolvedValue(snapshot);
});

describe("bounded knockout reconciliation route", () => {
  it("rejects missing/expired organizer sessions and cross-origin requests before reads or writes", async () => {
    expect((await POST(request({ intent: "preview" }, undefined, false))).status).toBe(403);
    expect((await POST(request(applyBody, "https://untrusted.example"))).status).toBe(403);
    mocks.verify.mockResolvedValue(false);
    expect((await POST(request(applyBody))).status).toBe(403);
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("previews without writes, revalidation, or cache storage", async () => {
    const result = await POST(request({ intent: "preview" }));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toMatchObject({ reconciliationId: "MGO-033" });
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("requires explicit bounded confirmation and a complete typed expected snapshot", async () => {
    for (const body of [
      { intent: "apply" }, { ...applyBody, confirmation: "yes" },
      { ...applyBody, reconciliationId: "another-operation" },
      { ...applyBody, expectedSnapshot: {} },
      { ...applyBody, arbitrarySql: "not supported" },
    ]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    const malformed = new NextRequest("https://mcgraw.example/organizer/reconcile-2026-knockout", {
      method: "POST", headers: {
        origin: "https://mcgraw.example", host: "mcgraw.example",
        cookie: "mgo_organizer=test-session",
      }, body: "{",
    });
    expect((await POST(malformed)).status).toBe(400);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("applies only the reviewed snapshot and revalidates all tournament surfaces", async () => {
    const result = await POST(request(applyBody));
    expect(result.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(snapshot);
    expect(mocks.revalidate).toHaveBeenCalledOnce();
    expect(await result.json()).toMatchObject({ status: "applied", snapshot });
  });

  it("surfaces conflicts and repeat attempts without successful revalidation", async () => {
    mocks.apply.mockRejectedValue(new mocks.Conflict("Already applied; no changes made."));
    const result = await POST(request(applyBody));
    expect(result.status).toBe(409);
    expect(await result.json()).toEqual({ error: "Already applied; no changes made." });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("reports database failures without exposing underlying data or secrets", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.apply.mockRejectedValue(new DataLayerError("private database error"));
      const result = await POST(request(applyBody));
      expect(result.status).toBe(503);
      expect(JSON.stringify(await result.json())).not.toContain("private database error");
      expect(log).toHaveBeenCalledWith("tournament_reconciliation_failed", {
        action: "MGO-033", intent: "apply",
      });
      expect(mocks.revalidate).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
