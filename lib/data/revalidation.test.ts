import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  TOURNAMENT_DATA_ROUTES,
  revalidateTournamentData,
} from "./revalidation";

describe("tournament revalidation", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it("refreshes every public and organizer tournament route", () => {
    revalidateTournamentData();

    const refreshed = revalidatePath.mock.calls.map(([route]) => route);

    expect(refreshed).toEqual([
      ...TOURNAMENT_DATA_ROUTES,
      "/matches/[code]/result",
      "/matches/[code]/schedule",
    ]);
    expect(refreshed).toContain("/");
    expect(refreshed).toContain("/groups");
    expect(refreshed).toContain("/matches");
    expect(refreshed).toContain("/bracket/quarterfinals");
    expect(refreshed).toContain("/matches/[code]/schedule");
    expect(refreshed).toContain("/matches/[code]/result");
    expect(
      revalidatePath.mock.calls
        .slice(0, TOURNAMENT_DATA_ROUTES.length)
        .every(([, type]) => type === undefined),
    ).toBe(true);
    expect(
      revalidatePath.mock.calls
        .slice(TOURNAMENT_DATA_ROUTES.length)
        .every(([, type]) => type === "page"),
    ).toBe(true);
  });

  it("also refreshes the organizer routes for a single match", () => {
    revalidateTournamentData("GA-01");

    const refreshed = revalidatePath.mock.calls.map(([route]) => route);

    expect(refreshed).toContain("/matches/GA-01/schedule");
    expect(refreshed).toContain("/matches/GA-01/result");
    expect(refreshed).not.toContain("/matches/[code]/schedule");
    expect(refreshed).not.toContain("/matches/[code]/result");
    expect(
      revalidatePath.mock.calls.every(([, type]) => type === undefined),
    ).toBe(true);
  });

  it("encodes match codes that need escaping", () => {
    revalidateTournamentData("GA 01/02");

    const refreshed = revalidatePath.mock.calls.map(([route]) => route);

    expect(refreshed).toContain("/matches/GA%2001%2F02/result");
  });
});
