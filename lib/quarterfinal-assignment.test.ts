import { describe, expect, it } from "vitest";

import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  type KnockoutMatchCode,
} from "./bracket";
import { DataIntegrityError } from "./data/errors";
import type { Team, TournamentMatch } from "./data/schema";
import {
  createQuarterfinalAssignmentPreview,
  quarterfinalVersionsMatch,
} from "./quarterfinal-assignment";

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

function knockoutMatches(
  overrides: Partial<Record<KnockoutMatchCode, Partial<TournamentMatch>>> = {},
) {
  return [
    ...BRACKET_ROUND_CODES.quarterfinals,
    ...BRACKET_ROUND_CODES.semifinals,
    ...BRACKET_ROUND_CODES.final,
  ].map((code, index) =>
    knockoutMatch(code, index + 1, overrides[code]),
  );
}

describe("quarterfinal assignment preview", () => {
  it("maps locked ranks to the four fixed quarterfinal paths", () => {
    const preview = createQuarterfinalAssignmentPreview({
      teams,
      matches: knockoutMatches(),
    });

    expect(preview.status).toBe("ready");
    expect(
      preview.rows.map(
        (row) =>
          `${row.code}:${row.team1Source}/${row.team2Source}`,
      ),
    ).toEqual([
      "QF1:A1/B4",
      "QF2:A2/B3",
      "QF3:A3/B2",
      "QF4:A4/B1",
    ]);
    expect(preview.rows[0].team1.name).toBe("Group A rank 1");
    expect(preview.rows[0].team2.name).toBe("Group B rank 4");
  });

  it("distinguishes exact, conflicting, and active assignments", () => {
    const exact = {
      QF1: { team1_id: teams[0].id, team2_id: teams[7].id },
      QF2: { team1_id: teams[1].id, team2_id: teams[6].id },
      QF3: { team1_id: teams[2].id, team2_id: teams[5].id },
      QF4: { team1_id: teams[3].id, team2_id: teams[4].id },
    };

    expect(
      createQuarterfinalAssignmentPreview({
        teams,
        matches: knockoutMatches(exact),
      }).status,
    ).toBe("assigned");
    expect(
      createQuarterfinalAssignmentPreview({
        teams,
        matches: knockoutMatches({
          ...exact,
          QF4: { team1_id: teams[0].id, team2_id: teams[4].id },
        }),
      }).status,
    ).toBe("conflict");
    expect(
      createQuarterfinalAssignmentPreview({
        teams,
        matches: knockoutMatches({
          ...exact,
          QF1: {
            ...exact.QF1,
            status: "scheduled",
            scheduled_at: timestamp,
          },
        }),
      }).status,
    ).toBe("activity");
    expect(
      createQuarterfinalAssignmentPreview({
        teams,
        matches: knockoutMatches(exact),
        hasActivityHistory: true,
      }).status,
    ).toBe("activity");
  });

  it("surfaces incomplete finalized ranks", () => {
    expect(() =>
      createQuarterfinalAssignmentPreview({
        teams: teams.filter(
          (team) =>
            !(team.group_label === "B" && team.final_rank === 4),
        ),
        matches: knockoutMatches(),
      }),
    ).toThrow(DataIntegrityError);
  });

  it("compares submitted match versions without relying on order", () => {
    const versions = createQuarterfinalAssignmentPreview({
      teams,
      matches: knockoutMatches(),
    }).expectedMatchVersions;

    expect(
      quarterfinalVersionsMatch(versions.toReversed(), versions),
    ).toBe(true);
    expect(
      quarterfinalVersionsMatch(
        [{ ...versions[0], updated_at: "2026-08-04T18:00:00Z" }, ...versions.slice(1)],
        versions,
      ),
    ).toBe(false);
  });
});
