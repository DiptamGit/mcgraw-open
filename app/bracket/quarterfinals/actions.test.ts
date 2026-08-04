import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  type KnockoutMatchCode,
} from "@/lib/bracket";
import type { TournamentData } from "@/lib/data/queries";
import type { Team, TournamentMatch } from "@/lib/data/schema";
import { createQuarterfinalAssignmentPreview } from "@/lib/quarterfinal-assignment";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assignQuarterfinalTeams: vi.fn(),
  getTournamentData: vi.fn(),
  hasQuarterfinalActivityHistory: vi.fn(),
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
  assignQuarterfinalTeams: mocks.assignQuarterfinalTeams,
}));

vi.mock("@/lib/data/queries", () => ({
  getTournamentData: mocks.getTournamentData,
  hasQuarterfinalActivityHistory:
    mocks.hasQuarterfinalActivityHistory,
}));

vi.mock("@/lib/data/revalidation", () => ({
  revalidateTournamentData: mocks.revalidateTournamentData,
}));

const timestamp = "2026-08-04T17:00:00Z";

function rankedTeam(
  groupLabel: "A" | "B",
  finalRank: number,
): Team {
  const prefix = groupLabel === "A" ? "a" : "b";
  return {
    id: `${prefix}${String(finalRank).padStart(7, "0")}-0000-4000-8000-000000000001`,
    name: `Group ${groupLabel} rank ${finalRank}`,
    group_label: groupLabel,
    final_rank: finalRank,
  };
}

const teams = [
  ...Array.from({ length: 4 }, (_, index) => rankedTeam("A", index + 1)),
  ...Array.from({ length: 4 }, (_, index) => rankedTeam("B", index + 1)),
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

function tournament(
  overrides: {
    finalized?: boolean;
    assigned?: boolean;
  } = {},
): TournamentData {
  const assigned = overrides.assigned ?? false;
  const matches = [
    ...BRACKET_ROUND_CODES.quarterfinals,
    ...BRACKET_ROUND_CODES.semifinals,
    ...BRACKET_ROUND_CODES.final,
  ].map((code, index) => {
    if (!assigned || !code.startsWith("QF")) {
      return knockoutMatch(code, index + 1);
    }

    const assignmentIndex = Number(code.at(-1)) - 1;
    const team1 = teams[assignmentIndex];
    const team2 = teams[7 - assignmentIndex];
    return knockoutMatch(code, index + 1, {
      team1_id: team1.id,
      team2_id: team2.id,
      team1,
      team2,
    });
  });

  const finalized = overrides.finalized ?? true;
  return {
    teams: finalized
      ? teams
      : teams.map((team) => ({ ...team, final_rank: null })),
    matches,
    state: {
      id: 1,
      group_stage_status: finalized ? "finalized" : "open",
      groups_finalized_at: finalized ? timestamp : null,
      tie_resolution_note: null,
      updated_at: timestamp,
    },
  };
}

function formData(data: TournamentData): FormData {
  const preview = createQuarterfinalAssignmentPreview({
    teams: data.teams,
    matches: data.matches,
  });
  const value = new FormData();
  value.set("expectedStateUpdatedAt", data.state.updated_at);
  value.set(
    "expectedMatchVersions",
    JSON.stringify(preview.expectedMatchVersions),
  );
  return value;
}

describe("assignQuarterfinals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizerServerAction.mockResolvedValue(undefined);
    mocks.hasQuarterfinalActivityHistory.mockResolvedValue(false);
    mocks.assignQuarterfinalTeams.mockResolvedValue([]);
  });

  it("authorizes before reading or changing tournament data", async () => {
    const data = tournament();
    mocks.requireOrganizerServerAction.mockRejectedValue(
      new OrganizerAuthorizationError(),
    );
    const { assignQuarterfinals } = await import("./actions");

    const result = await assignQuarterfinals(
      { status: "idle", message: null },
      formData(data),
    );

    expect(result.message).toContain("Organizer access expired");
    expect(mocks.getTournamentData).not.toHaveBeenCalled();
    expect(mocks.assignQuarterfinalTeams).not.toHaveBeenCalled();
  });

  it("rejects unfinalized standings and quarterfinal activity", async () => {
    const openData = tournament({ finalized: false });
    mocks.getTournamentData.mockResolvedValueOnce(openData);
    const { assignQuarterfinals } = await import("./actions");
    const finalizedData = tournament();

    const openResult = await assignQuarterfinals(
      { status: "idle", message: null },
      formData(finalizedData),
    );

    expect(openResult.message).toContain("Finalize the group standings");

    mocks.getTournamentData.mockResolvedValueOnce(finalizedData);
    mocks.hasQuarterfinalActivityHistory.mockResolvedValueOnce(true);
    const activityResult = await assignQuarterfinals(
      { status: "idle", message: null },
      formData(finalizedData),
    );

    expect(activityResult.message).toContain(
      "Quarterfinal activity has started",
    );
    expect(mocks.assignQuarterfinalTeams).not.toHaveBeenCalled();
  });

  it("rejects malformed preview input before loading tournament data", async () => {
    const submitted = new FormData();
    submitted.set("expectedStateUpdatedAt", "not-a-timestamp");
    submitted.set("expectedMatchVersions", "not-json");
    const { assignQuarterfinals } = await import("./actions");

    const result = await assignQuarterfinals(
      { status: "idle", message: null },
      submitted,
    );

    expect(result.message).toContain("preview is invalid");
    expect(mocks.getTournamentData).not.toHaveBeenCalled();
    expect(mocks.assignQuarterfinalTeams).not.toHaveBeenCalled();
  });

  it("rejects a stale bracket preview", async () => {
    const data = tournament();
    mocks.getTournamentData.mockResolvedValue(data);
    const submitted = formData(data);
    const versions = JSON.parse(
      String(submitted.get("expectedMatchVersions")),
    );
    versions[0].updated_at = "2026-08-04T16:00:00Z";
    submitted.set("expectedMatchVersions", JSON.stringify(versions));
    const { assignQuarterfinals } = await import("./actions");

    const result = await assignQuarterfinals(
      { status: "idle", message: null },
      submitted,
    );

    expect(result.status).toBe("conflict");
    expect(result.message).toContain("changed on another device");
    expect(mocks.assignQuarterfinalTeams).not.toHaveBeenCalled();
  });

  it("assigns the current preview and refreshes tournament routes", async () => {
    const data = tournament();
    mocks.getTournamentData.mockResolvedValue(data);
    const preview = createQuarterfinalAssignmentPreview({
      teams: data.teams,
      matches: data.matches,
    });
    const { assignQuarterfinals } = await import("./actions");

    await assignQuarterfinals(
      { status: "idle", message: null },
      formData(data),
    );

    expect(mocks.assignQuarterfinalTeams).toHaveBeenCalledWith({
      expectedStateUpdatedAt: timestamp,
      matchVersions: preview.expectedMatchVersions,
    });
    expect(mocks.revalidateTournamentData).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/bracket?assignment=assigned",
    );
  });

  it("treats an already correct draw as an idempotent success", async () => {
    const data = tournament({ assigned: true });
    mocks.getTournamentData.mockResolvedValue(data);
    const { assignQuarterfinals } = await import("./actions");

    await assignQuarterfinals(
      { status: "idle", message: null },
      formData(data),
    );

    expect(mocks.assignQuarterfinalTeams).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/bracket?assignment=already-assigned",
    );
  });
});
