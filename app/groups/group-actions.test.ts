import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import type { TournamentData } from "@/lib/data/queries";
import type { Team, TournamentMatch } from "@/lib/data/schema";
import {
  createFinalizationFormState,
  createFinalizationPreview,
} from "@/lib/groups/finalization";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  finalizeGroupStandings: vi.fn(),
  getTournamentData: vi.fn(),
  redirect: vi.fn(),
  reopenGroupStandings: vi.fn(),
  requireOrganizerServerAction: vi.fn(),
  revalidateTournamentData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/server-action", () => ({
  requireOrganizerServerAction: mocks.requireOrganizerServerAction,
}));

vi.mock("@/lib/data/mutations", () => ({
  finalizeGroupStandings: mocks.finalizeGroupStandings,
  reopenGroupStandings: mocks.reopenGroupStandings,
}));

vi.mock("@/lib/data/queries", () => ({
  getTournamentData: mocks.getTournamentData,
}));

vi.mock("@/lib/data/revalidation", () => ({
  revalidateTournamentData: mocks.revalidateTournamentData,
}));

const timestamp = "2026-08-03T18:00:00Z";
const team1: Team = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Alpha",
  group_label: "A",
  final_rank: null,
};
const team2: Team = {
  id: "a0000002-0000-4000-8000-000000000002",
  name: "Bravo",
  group_label: "A",
  final_rank: null,
};

function groupMatch(
  status: TournamentMatch["status"] = "completed",
): TournamentMatch {
  const isComplete = status === "completed";
  return {
    id: "c0000001-0000-4000-8000-000000000001",
    code: "GA-01",
    stage: "group",
    group_label: "A",
    label: null,
    team1_id: team1.id,
    team2_id: team2.id,
    status,
    scheduled_at: null,
    venue: null,
    deciding_set_format: isComplete ? "full_set" : null,
    outcome_type: isComplete ? "normal" : null,
    sets: isComplete
      ? [
          [6, 4],
          [6, 4],
        ]
      : null,
    winner_id: isComplete ? team1.id : null,
    played_at: isComplete ? timestamp : null,
    completed_at: isComplete ? timestamp : null,
    created_at: timestamp,
    updated_at: timestamp,
    team1,
    team2,
    winner: isComplete ? team1 : null,
  };
}

function quarterfinal(
  status: TournamentMatch["status"] = "unscheduled",
): TournamentMatch {
  return {
    id: "d0000001-0000-4000-8000-000000000001",
    code: "QF1",
    stage: "quarterfinal",
    group_label: null,
    label: "QF1: A1 vs B4",
    team1_id: team1.id,
    team2_id: team2.id,
    status,
    scheduled_at: status === "scheduled" ? timestamp : null,
    venue: status === "scheduled" ? "Court 1" : null,
    deciding_set_format: null,
    outcome_type: null,
    sets: null,
    winner_id: null,
    played_at: null,
    completed_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    team1,
    team2,
    winner: null,
  };
}

function tournament(
  match: TournamentMatch = groupMatch(),
): TournamentData {
  return {
    teams: [team1, team2],
    matches: [match],
    state: {
      id: 1,
      group_stage_status: "open",
      groups_finalized_at: null,
      tie_resolution_note: null,
      updated_at: timestamp,
    },
  };
}

function finalizeFormData(data: TournamentData): FormData {
  const preview = createFinalizationPreview(data);
  const formData = new FormData();
  formData.set("expectedStateUpdatedAt", data.state.updated_at);
  formData.set(
    "expectedMatchVersions",
    JSON.stringify(preview.expectedMatchVersions),
  );
  formData.set(
    "manualOrders",
    JSON.stringify(createFinalizationFormState(preview).values.manualOrders),
  );
  formData.set("tieResolutionNote", "");
  return formData;
}

describe("finalizeGroups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.finalizeGroupStandings.mockResolvedValue({
      id: 1,
      group_stage_status: "finalized",
      groups_finalized_at: timestamp,
      tie_resolution_note: null,
      updated_at: timestamp,
    });
  });

  it("authorizes before reading or changing tournament data", async () => {
    const data = tournament();
    mocks.requireOrganizerServerAction.mockRejectedValue(
      new OrganizerAuthorizationError(),
    );
    const { finalizeGroups } = await import("./finalize/actions");

    const result = await finalizeGroups(
      createFinalizationFormState(createFinalizationPreview(data)),
      finalizeFormData(data),
    );

    expect(result.message).toContain("Organizer access expired");
    expect(mocks.getTournamentData).not.toHaveBeenCalled();
    expect(mocks.finalizeGroupStandings).not.toHaveBeenCalled();
  });

  it("rejects early finalization without calling the RPC", async () => {
    const data = tournament(groupMatch("unscheduled"));
    mocks.getTournamentData.mockResolvedValue(data);
    const { finalizeGroups } = await import("./finalize/actions");

    const result = await finalizeGroups(
      createFinalizationFormState(createFinalizationPreview(data)),
      finalizeFormData(data),
    );

    expect(result.message).toContain("0 of 1 results");
    expect(mocks.finalizeGroupStandings).not.toHaveBeenCalled();
  });

  it("rejects a stale rank preview before finalization", async () => {
    const data = tournament();
    mocks.getTournamentData.mockResolvedValue(data);
    const formData = finalizeFormData(data);
    formData.set(
      "expectedMatchVersions",
      JSON.stringify([
        {
          match_id: data.matches[0].id,
          updated_at: "2026-08-03T17:00:00Z",
        },
      ]),
    );
    const { finalizeGroups } = await import("./finalize/actions");

    const result = await finalizeGroups(
      createFinalizationFormState(createFinalizationPreview(data)),
      formData,
    );

    expect(result.status).toBe("conflict");
    expect(result.message).toContain("result changed");
    expect(mocks.finalizeGroupStandings).not.toHaveBeenCalled();
  });

  it("submits the current computed snapshot and refreshes public routes", async () => {
    const data = tournament();
    mocks.getTournamentData.mockResolvedValue(data);
    const preview = createFinalizationPreview(data);
    const { finalizeGroups } = await import("./finalize/actions");

    await finalizeGroups(
      createFinalizationFormState(preview),
      finalizeFormData(data),
    );

    expect(mocks.finalizeGroupStandings).toHaveBeenCalledWith({
      expectedStateUpdatedAt: timestamp,
      matchVersions: preview.expectedMatchVersions,
      rankings: expect.arrayContaining([
        { team_id: team1.id, final_rank: 1 },
        { team_id: team2.id, final_rank: 2 },
      ]),
      tieResolutionNote: null,
    });
    expect(mocks.revalidateTournamentData).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/groups?transition=finalized",
    );
  });
});

describe("reopenGroups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.reopenGroupStandings.mockResolvedValue({
      id: 1,
      group_stage_status: "open",
      groups_finalized_at: null,
      tie_resolution_note: null,
      updated_at: timestamp,
    });
  });

  function finalizedTournament(
    knockout: TournamentMatch = quarterfinal(),
  ): TournamentData {
    return {
      teams: [
        { ...team1, final_rank: 1 },
        { ...team2, final_rank: 2 },
      ],
      matches: [groupMatch(), knockout],
      state: {
        id: 1,
        group_stage_status: "finalized",
        groups_finalized_at: timestamp,
        tie_resolution_note: null,
        updated_at: timestamp,
      },
    };
  }

  function reopenFormData(): FormData {
    const formData = new FormData();
    formData.set("expectedStateUpdatedAt", timestamp);
    return formData;
  }

  it("rejects reopening after a quarterfinal is scheduled", async () => {
    mocks.getTournamentData.mockResolvedValue(
      finalizedTournament(quarterfinal("scheduled")),
    );
    const { reopenGroups } = await import("./reopen/actions");

    const result = await reopenGroups(
      { status: "idle", message: null },
      reopenFormData(),
    );

    expect(result.message).toContain("QF1 is scheduled");
    expect(mocks.reopenGroupStandings).not.toHaveBeenCalled();
  });

  it("reopens and lets the RPC clear unscheduled assignments atomically", async () => {
    mocks.getTournamentData.mockResolvedValue(finalizedTournament());
    const { reopenGroups } = await import("./reopen/actions");

    await reopenGroups(
      { status: "idle", message: null },
      reopenFormData(),
    );

    expect(mocks.reopenGroupStandings).toHaveBeenCalledWith(timestamp);
    expect(mocks.revalidateTournamentData).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/groups?transition=reopened",
    );
  });
});
