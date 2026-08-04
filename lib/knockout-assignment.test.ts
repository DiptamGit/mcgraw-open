import { describe, expect, it } from "vitest";

import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  type KnockoutMatchCode,
} from "./bracket";
import type { Team, TournamentMatch } from "./data/schema";
import {
  createKnockoutAssignmentPreview,
  knockoutAssignmentSubmissionSchema,
} from "./knockout-assignment";

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
): TournamentMatch {
  return knockoutMatch(code, index, {
    team1_id: winner.id,
    team2_id: teams[(teams.indexOf(winner) + 1) % teams.length].id,
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
    team2: teams[(teams.indexOf(winner) + 1) % teams.length],
    winner,
  });
}

function knockoutMatches(
  overrides: Partial<Record<KnockoutMatchCode, TournamentMatch>> = {},
) {
  return [
    ...BRACKET_ROUND_CODES.quarterfinals,
    ...BRACKET_ROUND_CODES.semifinals,
    ...BRACKET_ROUND_CODES.final,
  ].map(
    (code, index) =>
      overrides[code] ?? knockoutMatch(code, index + 1),
  );
}

describe("knockout assignment preview", () => {
  it("makes only completed source winners ready", () => {
    const matches = knockoutMatches({
      QF1: completedMatch("QF1", 1, teams[0]),
    });

    const preview = createKnockoutAssignmentPreview(matches, "SF1");

    expect(preview.protected).toBe(false);
    expect(preview.slots.map((slot) => slot.status)).toEqual([
      "ready",
      "waiting",
    ]);
    expect(preview.slots[0].sourceLabel).toBe("Winner QF1");
    expect(preview.slots[0].eligibleWinner).toBe(teams[0]);
  });

  it("distinguishes matching and conflicting stored assignments", () => {
    const qf1 = completedMatch("QF1", 1, teams[0]);
    const qf2 = completedMatch("QF2", 2, teams[1]);
    const assigned = createKnockoutAssignmentPreview(
      knockoutMatches({
        QF1: qf1,
        QF2: qf2,
        SF1: knockoutMatch("SF1", 5, {
          team1_id: teams[0].id,
          team1: teams[0],
        }),
      }),
      "SF1",
    );
    const conflict = createKnockoutAssignmentPreview(
      knockoutMatches({
        QF1: qf1,
        QF2: qf2,
        SF1: knockoutMatch("SF1", 5, {
          team1_id: teams[2].id,
          team1: teams[2],
        }),
      }),
      "SF1",
    );

    expect(assigned.slots.map((slot) => slot.status)).toEqual([
      "assigned",
      "ready",
    ]);
    expect(conflict.slots[0].status).toBe("conflict");
  });

  it("protects scheduled and completed downstream matches", () => {
    const preview = createKnockoutAssignmentPreview(
      knockoutMatches({
        QF1: completedMatch("QF1", 1, teams[0]),
        QF2: completedMatch("QF2", 2, teams[1]),
        SF1: knockoutMatch("SF1", 5, {
          team1_id: teams[0].id,
          team2_id: teams[1].id,
          team1: teams[0],
          team2: teams[1],
          status: "scheduled",
          scheduled_at: timestamp,
        }),
      }),
      "SF1",
    );

    expect(preview.protected).toBe(true);
    expect(preview.slots.every((slot) => slot.status === "assigned")).toBe(
      true,
    );
  });

  it("flags duplicate source winners as conflicts", () => {
    const preview = createKnockoutAssignmentPreview(
      knockoutMatches({
        QF1: completedMatch("QF1", 1, teams[0]),
        QF2: completedMatch("QF2", 2, teams[0]),
      }),
      "SF1",
    );

    expect(preview.slots.every((slot) => slot.status === "conflict")).toBe(
      true,
    );
  });
});

describe("knockout assignment submission", () => {
  it("accepts typed assignment and clear requests", () => {
    const base = {
      downstreamCode: "SF1",
      teamSlot: "team1_id",
      teamId: teams[0].id,
      expectedDownstreamUpdatedAt: timestamp,
      expectedSourceUpdatedAt: timestamp,
    };

    expect(
      knockoutAssignmentSubmissionSchema.safeParse({
        ...base,
        intent: "assign",
      }).success,
    ).toBe(true);
    expect(
      knockoutAssignmentSubmissionSchema.safeParse({
        ...base,
        intent: "clear",
      }).success,
    ).toBe(true);
  });

  it("rejects quarterfinal destinations and unknown slots", () => {
    expect(
      knockoutAssignmentSubmissionSchema.safeParse({
        intent: "assign",
        downstreamCode: "QF1",
        teamSlot: "winner_id",
        teamId: teams[0].id,
        expectedDownstreamUpdatedAt: timestamp,
        expectedSourceUpdatedAt: timestamp,
      }).success,
    ).toBe(false);
  });
});
