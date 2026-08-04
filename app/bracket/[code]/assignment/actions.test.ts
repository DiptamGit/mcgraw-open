import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  type KnockoutMatchCode,
} from "@/lib/bracket";
import { KnockoutAssignmentError } from "@/lib/data/errors";
import type { TournamentData } from "@/lib/data/queries";
import type { Team, TournamentMatch } from "@/lib/data/schema";
import { createKnockoutAssignmentPreview } from "@/lib/knockout-assignment";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getTournamentData: vi.fn(),
  persistKnockoutAssignment: vi.fn(),
  redirect: vi.fn(),
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
  updateKnockoutAssignment: mocks.persistKnockoutAssignment,
}));

vi.mock("@/lib/data/queries", () => ({
  getTournamentData: mocks.getTournamentData,
}));

vi.mock("@/lib/data/revalidation", () => ({
  revalidateTournamentData: mocks.revalidateTournamentData,
}));

const timestamp = "2026-08-04T17:00:00Z";
const teams: Team[] = [
  {
    id: "a0000001-0000-4000-8000-000000000001",
    name: "QF1 winner",
    group_label: "A",
    final_rank: 1,
  },
  {
    id: "a0000002-0000-4000-8000-000000000002",
    name: "QF2 winner",
    group_label: "A",
    final_rank: 2,
  },
  {
    id: "b0000001-0000-4000-8000-000000000001",
    name: "QF3 winner",
    group_label: "B",
    final_rank: 1,
  },
  {
    id: "b0000002-0000-4000-8000-000000000002",
    name: "QF4 winner",
    group_label: "B",
    final_rank: 2,
  },
];

function knockoutMatch(
  code: KnockoutMatchCode,
  index: number,
  overrides: Partial<TournamentMatch> = {},
): TournamentMatch {
  return {
    id: `c1000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    code,
    stage: BRACKET_MAPPING[code].stage,
    group_label: null,
    label: BRACKET_MAPPING[code].label,
    team1_id: null,
    team2_id: null,
    status: "unscheduled",
    scheduled_at: null,
    venue: null,
    deciding_set_format: null,
    outcome_type: null,
    sets: null,
    winner_id: null,
    played_at: null,
    completed_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    team1: null,
    team2: null,
    winner: null,
    ...overrides,
  };
}

function completedMatch(
  code: KnockoutMatchCode,
  index: number,
  winner: Team,
  opponent: Team,
): TournamentMatch {
  return knockoutMatch(code, index, {
    team1_id: winner.id,
    team2_id: opponent.id,
    status: "completed",
    deciding_set_format: "full_set",
    outcome_type: "normal",
    sets: [
      [6, 4],
      [6, 4],
    ],
    winner_id: winner.id,
    played_at: timestamp,
    completed_at: timestamp,
    team1: winner,
    team2: opponent,
    winner,
  });
}

function tournament(
  overrides: Partial<Record<KnockoutMatchCode, TournamentMatch>> = {},
): TournamentData {
  const matches = [
    ...BRACKET_ROUND_CODES.quarterfinals,
    ...BRACKET_ROUND_CODES.semifinals,
    ...BRACKET_ROUND_CODES.final,
  ].map(
    (code, index) =>
      overrides[code] ?? knockoutMatch(code, index + 1),
  );

  return {
    teams,
    matches,
    state: {
      id: 1,
      group_stage_status: "finalized",
      groups_finalized_at: timestamp,
      tie_resolution_note: null,
      updated_at: timestamp,
    },
  };
}

function submission(
  data: TournamentData,
  intent: "assign" | "clear",
  downstreamCode: "SF1" | "SF2" | "Final",
  teamSlot: "team1_id" | "team2_id",
  teamId: string,
): FormData {
  const preview = createKnockoutAssignmentPreview(
    data.matches,
    downstreamCode,
  );
  const slot = preview.slots.find(
    (candidate) => candidate.teamSlot === teamSlot,
  );
  if (!slot) {
    throw new Error("Test setup is missing the assignment slot.");
  }

  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("downstreamCode", downstreamCode);
  formData.set("teamSlot", teamSlot);
  formData.set("teamId", teamId);
  formData.set(
    "expectedDownstreamUpdatedAt",
    preview.downstreamMatch.updated_at,
  );
  formData.set(
    "expectedSourceUpdatedAt",
    slot.sourceMatch.updated_at,
  );
  return formData;
}

describe("updateKnockoutAssignment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.persistKnockoutAssignment.mockResolvedValue({});
  });

  it("authorizes before reading tournament data", async () => {
    const data = tournament();
    mocks.requireOrganizerServerAction.mockRejectedValue(
      new OrganizerAuthorizationError(),
    );
    const { updateKnockoutAssignment } = await import("./actions");

    const result = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(data, "assign", "SF1", "team1_id", teams[0].id),
    );

    expect(result.message).toContain("Organizer access expired");
    expect(mocks.getTournamentData).not.toHaveBeenCalled();
    expect(mocks.persistKnockoutAssignment).not.toHaveBeenCalled();
  });

  it("rejects malformed and premature assignments", async () => {
    const { updateKnockoutAssignment } = await import("./actions");
    const malformed = await updateKnockoutAssignment(
      { status: "idle", message: null },
      new FormData(),
    );

    expect(malformed.message).toContain("request is invalid");

    const data = tournament();
    mocks.getTournamentData.mockResolvedValue(data);
    const premature = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(data, "assign", "SF1", "team1_id", teams[0].id),
    );

    expect(premature.message).toContain("Complete QF1");
    expect(mocks.persistKnockoutAssignment).not.toHaveBeenCalled();
  });

  it("assigns the eligible winner and refreshes tournament routes", async () => {
    const data = tournament({
      QF1: completedMatch("QF1", 1, teams[0], teams[1]),
    });
    mocks.getTournamentData.mockResolvedValue(data);
    const formData = submission(
      data,
      "assign",
      "SF1",
      "team1_id",
      teams[0].id,
    );
    const { updateKnockoutAssignment } = await import("./actions");

    await updateKnockoutAssignment(
      { status: "idle", message: null },
      formData,
    );

    expect(mocks.persistKnockoutAssignment).toHaveBeenCalledWith({
      intent: "assign",
      downstreamCode: "SF1",
      teamSlot: "team1_id",
      teamId: teams[0].id,
      expectedDownstreamUpdatedAt: timestamp,
      expectedSourceUpdatedAt: timestamp,
    });
    expect(mocks.revalidateTournamentData).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/bracket?progression=assigned&match=SF1",
    );
  });

  it("rejects invalid, repeated, and stale choices", async () => {
    const qf1 = completedMatch("QF1", 1, teams[0], teams[1]);
    const ready = tournament({ QF1: qf1 });
    mocks.getTournamentData.mockResolvedValueOnce(ready);
    const { updateKnockoutAssignment } = await import("./actions");

    const invalid = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(
        ready,
        "assign",
        "SF1",
        "team1_id",
        teams[1].id,
      ),
    );
    expect(invalid.status).toBe("conflict");
    expect(invalid.message).toContain("does not match");

    const assigned = tournament({
      QF1: qf1,
      SF1: knockoutMatch("SF1", 5, {
        team1_id: teams[0].id,
        team1: teams[0],
      }),
    });
    mocks.getTournamentData.mockResolvedValueOnce(assigned);
    const repeated = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(
        assigned,
        "assign",
        "SF1",
        "team1_id",
        teams[0].id,
      ),
    );
    expect(repeated.message).toContain("already assigned");

    mocks.getTournamentData.mockResolvedValueOnce(ready);
    const staleForm = submission(
      ready,
      "assign",
      "SF1",
      "team1_id",
      teams[0].id,
    );
    staleForm.set(
      "expectedSourceUpdatedAt",
      "2026-08-04T16:00:00Z",
    );
    const stale = await updateKnockoutAssignment(
      { status: "idle", message: null },
      staleForm,
    );
    expect(stale.status).toBe("conflict");
    expect(stale.message).toContain("changed on another device");
    expect(mocks.persistKnockoutAssignment).not.toHaveBeenCalled();
  });

  it("clears an unscheduled assignment but protects scheduled matches", async () => {
    const qf1 = completedMatch("QF1", 1, teams[0], teams[1]);
    const assignedSf1 = knockoutMatch("SF1", 5, {
      team1_id: teams[0].id,
      team1: teams[0],
    });
    const clearable = tournament({ QF1: qf1, SF1: assignedSf1 });
    mocks.getTournamentData.mockResolvedValueOnce(clearable);
    const { updateKnockoutAssignment } = await import("./actions");

    await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(
        clearable,
        "clear",
        "SF1",
        "team1_id",
        teams[0].id,
      ),
    );

    expect(mocks.persistKnockoutAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "clear", downstreamCode: "SF1" }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/bracket?progression=cleared&match=SF1",
    );

    const protectedData = tournament({
      QF1: qf1,
      QF2: completedMatch("QF2", 2, teams[1], teams[0]),
      SF1: knockoutMatch("SF1", 5, {
        team1_id: teams[0].id,
        team2_id: teams[1].id,
        team1: teams[0],
        team2: teams[1],
        status: "scheduled",
        scheduled_at: timestamp,
      }),
    });
    mocks.getTournamentData.mockResolvedValueOnce(protectedData);
    const protectedResult = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(
        protectedData,
        "clear",
        "SF1",
        "team1_id",
        teams[0].id,
      ),
    );

    expect(protectedResult.message).toContain("cannot be changed");
  });

  it("surfaces transactional conflicts without successful revalidation", async () => {
    const data = tournament({
      QF1: completedMatch("QF1", 1, teams[0], teams[1]),
    });
    mocks.getTournamentData.mockResolvedValue(data);
    mocks.persistKnockoutAssignment.mockRejectedValue(
      new KnockoutAssignmentError("DOWNSTREAM_MATCH_CONFLICT"),
    );
    const { updateKnockoutAssignment } = await import("./actions");

    const result = await updateKnockoutAssignment(
      { status: "idle", message: null },
      submission(data, "assign", "SF1", "team1_id", teams[0].id),
    );

    expect(result.status).toBe("conflict");
    expect(result.message).toContain("changed while saving");
    expect(mocks.revalidateTournamentData).not.toHaveBeenCalled();
  });
});
