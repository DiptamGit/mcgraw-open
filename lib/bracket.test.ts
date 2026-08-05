import { describe, expect, it } from "vitest";

import { DataIntegrityError } from "./data/errors";
import type { Team, TournamentMatch } from "./data/schema";
import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  computeChampionPath,
  getBracketSourceLabel,
  organizeKnockoutBracket,
  type KnockoutMatchCode,
} from "./bracket";

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
    created_at: "2026-08-01T19:00:00+00:00",
    updated_at: "2026-08-01T19:00:00+00:00",
    team1: null,
    team2: null,
    winner: null,
    ...overrides,
  };
}

function seededKnockoutMatches(): TournamentMatch[] {
  return [
    ...BRACKET_ROUND_CODES.quarterfinals,
    ...BRACKET_ROUND_CODES.semifinals,
    ...BRACKET_ROUND_CODES.final,
  ].map((code, index) => knockoutMatch(code, index + 1));
}

describe("knockout bracket", () => {
  it("organizes all seven matches in fixed 4-2-1 order", () => {
    const rounds = organizeKnockoutBracket(
      seededKnockoutMatches().toReversed(),
    );

    expect(rounds.quarterfinals.map((match) => match.code)).toEqual([
      "QF1",
      "QF2",
      "QF3",
      "QF4",
    ]);
    expect(rounds.semifinals.map((match) => match.code)).toEqual([
      "SF1",
      "SF2",
    ]);
    expect(rounds.final.map((match) => match.code)).toEqual(["Final"]);
  });

  it("reads every participant source from the typed mapping", () => {
    expect(getBracketSourceLabel("QF1", "team1")).toBe("A1");
    expect(getBracketSourceLabel("QF1", "team2")).toBe("B4");
    expect(getBracketSourceLabel("QF4", "team1")).toBe("A4");
    expect(getBracketSourceLabel("QF4", "team2")).toBe("B1");
    expect(getBracketSourceLabel("SF1", "team1")).toBe("Winner QF1");
    expect(getBracketSourceLabel("SF2", "team2")).toBe("Winner QF4");
    expect(getBracketSourceLabel("Final", "team1")).toBe("Winner SF1");
    expect(getBracketSourceLabel("Final", "team2")).toBe("Winner SF2");
  });

  it("surfaces missing, duplicate, unknown, and mis-staged matches", () => {
    const matches = seededKnockoutMatches();

    expect(() => organizeKnockoutBracket(matches.slice(0, -1))).toThrow(
      "Knockout bracket is missing match Final.",
    );
    expect(() =>
      organizeKnockoutBracket([
        ...matches,
        knockoutMatch("QF1", 8),
      ]),
    ).toThrow("Knockout match QF1 appears more than once.");
    expect(() =>
      organizeKnockoutBracket([
        ...matches.slice(1),
        {
          ...knockoutMatch("QF1", 1),
          code: "Round-1",
        },
      ]),
    ).toThrow("Knockout match Round-1 has no bracket source mapping.");
    expect(() =>
      organizeKnockoutBracket([
        ...matches.slice(1),
        knockoutMatch("QF1", 1, { stage: "semifinal" }),
      ]),
    ).toThrow("Knockout match QF1 has an invalid bracket stage.");
  });

  it("uses a data-integrity error for an unknown source", () => {
    expect(() => getBracketSourceLabel("Round-1", "team1")).toThrow(
      DataIntegrityError,
    );
  });
});

describe("computeChampionPath", () => {
  const champion: Team = {
    id: "a0000001-0000-4000-8000-000000000001",
    name: "Net Results - Ranjit / Venu C",
    group_label: "A",
    final_rank: 1,
  };

  it("highlights nothing before the first knockout result", () => {
    const rounds = organizeKnockoutBracket(seededKnockoutMatches());
    const path = computeChampionPath(rounds);

    expect(path.highlightedEdges).toEqual([]);
    expect(path.ballRoute).toEqual([]);
    expect(path.championName).toBeNull();
  });

  it("highlights only the connectors a recorded winner has advanced along", () => {
    const matches = seededKnockoutMatches();
    const qf1 = matches.findIndex((match) => match.code === "QF1");
    matches[qf1] = knockoutMatch("QF1", qf1 + 1, {
      status: "completed",
      winner_id: champion.id,
      winner: champion,
    });

    const path = computeChampionPath(organizeKnockoutBracket(matches));

    expect(path.highlightedEdges).toEqual(["QF1-SF1"]);
    expect(path.ballRoute).toEqual(["QF1-SF1"]);
    expect(path.championName).toBeNull();
  });

  it("traces the full champion route once the final is complete", () => {
    const decided = { status: "completed", winner_id: champion.id } as const;
    const matches = seededKnockoutMatches().map((match, index) => {
      if (match.code === "Final") {
        return knockoutMatch("Final", index + 1, {
          ...decided,
          winner: champion,
        });
      }

      if (match.code === "QF1" || match.code === "SF1") {
        return knockoutMatch(match.code, index + 1, { ...decided });
      }

      return match;
    });

    const path = computeChampionPath(organizeKnockoutBracket(matches));

    expect(path.highlightedEdges).toEqual([
      "QF1-SF1",
      "SF1-Final",
      "Final-Champion",
    ]);
    expect(path.ballRoute).toEqual([
      "QF1-SF1",
      "SF1-Final",
      "Final-Champion",
    ]);
    expect(path.championName).toBe(champion.name);
  });
});
