import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { MatchMutationError } from "@/lib/data/errors";
import type {
  MatchRecord,
  TournamentMatch,
  TournamentState,
} from "@/lib/data/schema";
import { createResultFormState } from "@/lib/matches/result";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getTournamentData: vi.fn(),
  requireOrganizerServerAction: vi.fn(),
  revalidateTournamentData: vi.fn(),
  updateMatchWithVersion: vi.fn(),
}));

vi.mock("@/lib/auth/server-action", () => ({
  requireOrganizerServerAction: mocks.requireOrganizerServerAction,
}));

vi.mock("@/lib/data/queries", () => ({
  getTournamentData: mocks.getTournamentData,
}));

vi.mock("@/lib/data/mutations", () => ({
  updateMatchWithVersion: mocks.updateMatchWithVersion,
}));

vi.mock("@/lib/data/revalidation", () => ({
  revalidateTournamentData: mocks.revalidateTournamentData,
}));

const team1 = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Team One",
  group_label: "A" as const,
  final_rank: null,
};
const team2 = {
  id: "a0000002-0000-4000-8000-000000000002",
  name: "Team Two",
  group_label: "A" as const,
  final_rank: null,
};

const match: TournamentMatch = {
  id: "a1000000-0000-4000-8000-000000000001",
  code: "GA-01",
  stage: "group",
  group_label: "A",
  label: null,
  team1_id: team1.id,
  team2_id: team2.id,
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
  team1,
  team2,
  winner: null,
};

const tournamentState: TournamentState = {
  id: 1,
  group_stage_status: "open",
  groups_finalized_at: null,
  tie_resolution_note: null,
  updated_at: "2026-08-01T19:00:00Z",
};

function tournament(matches: TournamentMatch[] = [match]) {
  return {
    teams: [team1, team2],
    matches,
    state: tournamentState,
  };
}

function resultFormData(
  overrides: Record<string, string> = {},
): FormData {
  const values = {
    intent: "save",
    matchId: match.id,
    expectedUpdatedAt: match.updated_at,
    outcomeType: "normal",
    winnerId: team1.id,
    decidingSetFormat: "match_tiebreak",
    playedDate: "2026-08-02",
    playedTime: "19:30",
    set1Team1: "6",
    set1Team2: "4",
    set2Team1: "4",
    set2Team2: "6",
    set3Team1: "10",
    set3Team2: "8",
    ...overrides,
  };
  const formData = new FormData();

  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value);
  }

  return formData;
}

function asRecord(value: TournamentMatch): MatchRecord {
  const { team1: _team1, team2: _team2, winner: _winner, ...record } = value;
  void _team1;
  void _team2;
  void _winner;
  return record;
}

describe("updateMatchResult", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T20:00:00Z"));
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.getTournamentData.mockResolvedValue(tournament());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("authorizes before loading or changing tournament data", async () => {
    mocks.requireOrganizerServerAction.mockRejectedValue(
      new OrganizerAuthorizationError(),
    );
    const { updateMatchResult } = await import("./actions");

    const result = await updateMatchResult(
      createResultFormState(match),
      resultFormData(),
    );

    expect(result.message).toContain("Organizer access expired");
    expect(mocks.getTournamentData).not.toHaveBeenCalled();
    expect(mocks.updateMatchWithVersion).not.toHaveBeenCalled();
  });

  it("persists a backdated normal result and revalidates public routes", async () => {
    const updated: MatchRecord = {
      ...asRecord(match),
      status: "completed",
      deciding_set_format: "match_tiebreak",
      outcome_type: "normal",
      sets: [
        [6, 4],
        [4, 6],
        [10, 8],
      ],
      winner_id: team1.id,
      played_at: "2026-08-03T00:30:00Z",
      completed_at: "2026-08-03T20:00:00Z",
      updated_at: "2026-08-03T20:00:01Z",
    };
    mocks.updateMatchWithVersion.mockResolvedValue({
      status: "updated",
      match: updated,
    });

    const { updateMatchResult } = await import("./actions");

    const result = await updateMatchResult(
      createResultFormState(match),
      resultFormData(),
    );

    expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith({
      id: match.id,
      expectedUpdatedAt: match.updated_at,
      changes: {
        status: "completed",
        deciding_set_format: "match_tiebreak",
        outcome_type: "normal",
        sets: [
          [6, 4],
          [4, 6],
          [10, 8],
        ],
        winner_id: team1.id,
        played_at: "2026-08-03T00:30:00Z",
        completed_at: "2026-08-03T20:00:00.000Z",
      },
    });
    expect(mocks.revalidateTournamentData).toHaveBeenCalledWith(match.code);
    expect(result).toMatchObject({
      status: "success",
      message: "Result recorded.",
      hasResult: true,
      expectedUpdatedAt: updated.updated_at,
    });
  });

  it("surfaces a downstream lock that wins a concurrent result race", async () => {
    const quarterfinal: TournamentMatch = {
      ...match,
      code: "QF1",
      stage: "quarterfinal",
      group_label: null,
      label: "QF1: A1 vs B4",
    };
    const semifinal: TournamentMatch = {
      ...match,
      id: "a1000000-0000-4000-8000-000000000002",
      code: "SF1",
      stage: "semifinal",
      group_label: null,
      label: "SF1: Winner QF1 vs Winner QF2",
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    };
    mocks.getTournamentData.mockResolvedValue(
      tournament([quarterfinal, semifinal]),
    );
    mocks.updateMatchWithVersion.mockRejectedValue(
      new MatchMutationError("UPSTREAM_RESULT_LOCKED"),
    );
    const { updateMatchResult } = await import("./actions");

    const result = await updateMatchResult(
      createResultFormState(quarterfinal),
      resultFormData({
        matchId: quarterfinal.id,
        expectedUpdatedAt: quarterfinal.updated_at,
      }),
    );

    expect(result.message).toContain("assigned to the next round");
    expect(mocks.revalidateTournamentData).not.toHaveBeenCalled();
  });

  it("records a retirement with a partial score", async () => {
    const updated: MatchRecord = {
      ...asRecord(match),
      status: "completed",
      deciding_set_format: "full_set",
      outcome_type: "retirement",
      sets: [
        [6, 4],
        [2, 2],
      ],
      winner_id: team2.id,
      played_at: "2026-08-03T00:30:00Z",
      completed_at: "2026-08-03T20:00:00Z",
      updated_at: "2026-08-03T20:00:01Z",
    };
    mocks.updateMatchWithVersion.mockResolvedValue({
      status: "updated",
      match: updated,
    });
    const { updateMatchResult } = await import("./actions");

    const result = await updateMatchResult(
      createResultFormState(match),
      resultFormData({
        outcomeType: "retirement",
        winnerId: team2.id,
        decidingSetFormat: "full_set",
        set1Team1: "6",
        set1Team2: "4",
        set2Team1: "2",
        set2Team2: "2",
        set3Team1: "",
        set3Team2: "",
      }),
    );

    expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith({
      id: match.id,
      expectedUpdatedAt: match.updated_at,
      changes: {
        status: "completed",
        deciding_set_format: "full_set",
        outcome_type: "retirement",
        sets: [
          [6, 4],
          [2, 2],
        ],
        winner_id: team2.id,
        played_at: "2026-08-03T00:30:00Z",
        completed_at: "2026-08-03T20:00:00.000Z",
      },
    });
    expect(result).toMatchObject({
      status: "success",
      message: "Result recorded.",
      values: { outcomeType: "retirement" },
    });
  });

  it("records a scoreless walkover and clears stale score fields", async () => {
    const currentNormal: TournamentMatch = {
      ...match,
      status: "completed",
      deciding_set_format: "full_set",
      outcome_type: "normal",
      sets: [
        [6, 4],
        [6, 3],
      ],
      winner_id: team1.id,
      winner: team1,
      played_at: "2026-08-02T23:00:00Z",
      completed_at: "2026-08-03T00:00:00Z",
    };
    const updated: MatchRecord = {
      ...asRecord(currentNormal),
      deciding_set_format: null,
      outcome_type: "walkover",
      sets: null,
      winner_id: team2.id,
      played_at: "2026-08-03T00:30:00Z",
      completed_at: "2026-08-03T20:00:00Z",
      updated_at: "2026-08-03T20:00:01Z",
    };
    mocks.getTournamentData.mockResolvedValue(tournament([currentNormal]));
    mocks.updateMatchWithVersion.mockResolvedValue({
      status: "updated",
      match: updated,
    });
    const { updateMatchResult } = await import("./actions");

    const result = await updateMatchResult(
      createResultFormState(currentNormal),
      resultFormData({
        outcomeType: "walkover",
        expectedUpdatedAt: currentNormal.updated_at,
        winnerId: team2.id,
      }),
    );

    expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith({
      id: match.id,
      expectedUpdatedAt: currentNormal.updated_at,
      changes: {
        status: "completed",
        deciding_set_format: null,
        outcome_type: "walkover",
        sets: null,
        winner_id: team2.id,
        played_at: "2026-08-03T00:30:00Z",
        completed_at: "2026-08-03T20:00:00.000Z",
      },
    });
    expect(result).toMatchObject({
      status: "success",
      message: "Result updated.",
      values: { outcomeType: "walkover" },
    });
  });

  it("replaces exceptional fields when correcting back to normal", async () => {
    const currentRetirement: TournamentMatch = {
      ...match,
      status: "completed",
      deciding_set_format: "full_set",
      outcome_type: "retirement",
      sets: [[2, 1]],
      winner_id: team2.id,
      winner: team2,
      played_at: "2026-08-02T23:00:00Z",
      completed_at: "2026-08-03T00:00:00Z",
    };
    const updated: MatchRecord = {
      ...asRecord(currentRetirement),
      outcome_type: "normal",
      sets: [
        [6, 4],
        [4, 6],
        [10, 8],
      ],
      winner_id: team1.id,
      played_at: "2026-08-03T00:30:00Z",
      completed_at: "2026-08-03T20:00:00Z",
      updated_at: "2026-08-03T20:00:01Z",
    };
    mocks.getTournamentData.mockResolvedValue(
      tournament([currentRetirement]),
    );
    mocks.updateMatchWithVersion.mockResolvedValue({
      status: "updated",
      match: updated,
    });
    const { updateMatchResult } = await import("./actions");

    await updateMatchResult(
      createResultFormState(currentRetirement),
      resultFormData({
        expectedUpdatedAt: currentRetirement.updated_at,
      }),
    );

    expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.objectContaining({
          outcome_type: "normal",
          deciding_set_format: "match_tiebreak",
          sets: [
            [6, 4],
            [4, 6],
            [10, 8],
          ],
          winner_id: team1.id,
        }),
      }),
    );
  });

  it("rejects stale writes and finalized group results", async () => {
    mocks.getTournamentData.mockResolvedValueOnce(
      tournament([
        {
          ...match,
          updated_at: "2026-08-03T20:00:01Z",
        },
      ]),
    );
    const { updateMatchResult } = await import("./actions");

    const conflict = await updateMatchResult(
      createResultFormState(match),
      resultFormData(),
    );
    expect(conflict.status).toBe("conflict");

    mocks.getTournamentData.mockResolvedValueOnce({
      ...tournament(),
      state: {
        ...tournamentState,
        group_stage_status: "finalized",
        groups_finalized_at: "2026-09-30T20:00:00Z",
      },
    });
    const locked = await updateMatchResult(
      createResultFormState(match),
      resultFormData(),
    );
    expect(locked.message).toContain("standings are finalized");
    expect(mocks.updateMatchWithVersion).not.toHaveBeenCalled();
  });

  it.each([
    {
      scheduledAt: "2026-08-02T23:00:00Z",
      venue: "McGraw Park Court 2",
      restoredStatus: "scheduled",
      message: "Result cleared. The match is scheduled again.",
    },
    {
      scheduledAt: null,
      venue: null,
      restoredStatus: "unscheduled",
      message: "Result cleared. The match is unscheduled again.",
    },
  ])(
    "clears a result and restores $restoredStatus status",
    async ({ scheduledAt, venue, restoredStatus, message }) => {
      const completed: TournamentMatch = {
        ...match,
        status: "completed",
        scheduled_at: scheduledAt,
        venue,
        deciding_set_format: "full_set",
        outcome_type: "normal",
        sets: [
          [6, 4],
          [6, 3],
        ],
        winner_id: team1.id,
        winner: team1,
        played_at: "2026-08-02T23:00:00Z",
        completed_at: "2026-08-03T00:00:00Z",
      };
      const cleared: MatchRecord = {
        ...asRecord(completed),
        status: restoredStatus as "scheduled" | "unscheduled",
        deciding_set_format: null,
        outcome_type: null,
        sets: null,
        winner_id: null,
        played_at: null,
        completed_at: null,
        updated_at: "2026-08-03T20:00:01Z",
      };
      mocks.getTournamentData.mockResolvedValue(tournament([completed]));
      mocks.updateMatchWithVersion.mockResolvedValue({
        status: "updated",
        match: cleared,
      });
      const { updateMatchResult } = await import("./actions");

      const result = await updateMatchResult(
        createResultFormState(completed),
        resultFormData({
          intent: "clear",
          expectedUpdatedAt: completed.updated_at,
        }),
      );

      expect(mocks.updateMatchWithVersion).toHaveBeenCalledWith({
        id: match.id,
        expectedUpdatedAt: completed.updated_at,
        changes: {
          status: restoredStatus,
          deciding_set_format: null,
          outcome_type: null,
          sets: null,
          winner_id: null,
          played_at: null,
          completed_at: null,
        },
      });
      expect(result).toMatchObject({
        status: "success",
        message,
        hasResult: false,
      });
    },
  );
});
