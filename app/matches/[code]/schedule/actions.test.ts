import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { createScheduleFormState } from "@/lib/matches/schedule";
import type { MatchRecord } from "@/lib/data/schema";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getMatchRecordById: vi.fn(),
  requireOrganizerServerAction: vi.fn(),
  revalidateTournamentData: vi.fn(),
  updateMatchWithVersion: vi.fn(),
}));

vi.mock("@/lib/auth/server-action", () => ({
  requireOrganizerServerAction: mocks.requireOrganizerServerAction,
}));

vi.mock("@/lib/data/queries", () => ({
  getMatchRecordById: mocks.getMatchRecordById,
}));

vi.mock("@/lib/data/mutations", () => ({
  updateMatchWithVersion: mocks.updateMatchWithVersion,
}));

vi.mock("@/lib/data/revalidation", () => ({
  revalidateTournamentData: mocks.revalidateTournamentData,
}));

const match: MatchRecord = {
  id: "a1000000-0000-4000-8000-000000000001",
  code: "GA-01",
  stage: "group",
  group_label: "A",
  label: null,
  team1_id: "a0000001-0000-4000-8000-000000000001",
  team2_id: "a0000002-0000-4000-8000-000000000002",
  status: "unscheduled",
  scheduled_at: null,
  venue: null,
  deciding_set_format: null,
  outcome_type: null,
  sets: null,
  winner_id: null,
  played_at: null,
  completed_at: null,
  created_at: "2026-08-01T19:00:00Z",
  updated_at: "2026-08-01T19:00:00Z",
};

function scheduleFormData(): FormData {
  const formData = new FormData();
  formData.set("intent", "save");
  formData.set("matchId", match.id);
  formData.set("expectedUpdatedAt", match.updated_at);
  formData.set("date", "2026-08-03");
  formData.set("time", "19:30");
  formData.set("venue", "McGraw Park Court 2");
  return formData;
}

describe("updateMatchSchedule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.getMatchRecordById.mockResolvedValue(match);
  });

  it("authorizes before attempting a mutation", async () => {
    mocks.requireOrganizerServerAction.mockRejectedValue(
      new OrganizerAuthorizationError(),
    );
    const { updateMatchSchedule } = await import("./actions");

    const result = await updateMatchSchedule(
      createScheduleFormState(match),
      scheduleFormData(),
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("Organizer access expired");
    expect(mocks.getMatchRecordById).not.toHaveBeenCalled();
    expect(mocks.updateMatchWithVersion).not.toHaveBeenCalled();
  });

  it("stores the entered Central Time as UTC and revalidates public routes", async () => {
    const updatedMatch: MatchRecord = {
      ...match,
      status: "scheduled",
      scheduled_at: "2026-08-04T00:30:00Z",
      venue: "McGraw Park Court 2",
      updated_at: "2026-08-03T20:00:01Z",
    };
    mocks.updateMatchWithVersion.mockResolvedValue({
      status: "updated",
      match: updatedMatch,
    });
    const { updateMatchSchedule } = await import("./actions");

    const result = await updateMatchSchedule(
      createScheduleFormState(match),
      scheduleFormData(),
    );

    expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith({
      id: match.id,
      expectedUpdatedAt: match.updated_at,
      changes: {
        status: "scheduled",
        scheduled_at: "2026-08-04T00:30:00Z",
        venue: "McGraw Park Court 2",
      },
    });
    expect(mocks.revalidateTournamentData).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "success",
      message: "Match scheduled.",
      expectedUpdatedAt: updatedMatch.updated_at,
    });
  });

  it("preserves the newer value when the submitted version is stale", async () => {
    mocks.getMatchRecordById.mockResolvedValue({
      ...match,
      status: "scheduled",
      scheduled_at: "2026-08-04T01:00:00Z",
      venue: "Newer court",
      updated_at: "2026-08-03T20:00:01Z",
    });
    const { updateMatchSchedule } = await import("./actions");

    const result = await updateMatchSchedule(
      createScheduleFormState(match),
      scheduleFormData(),
    );

    expect(result.status).toBe("conflict");
    expect(result.message).toContain("Reload");
    expect(mocks.updateMatchWithVersion).not.toHaveBeenCalled();
    expect(mocks.revalidateTournamentData).not.toHaveBeenCalled();
  });
});
