import { describe, expect, it } from "vitest";

import { DataIntegrityError } from "../data/errors";
import type { MatchRecord, Team } from "../data/schema";
import { calculateGroupStandings } from "./calculate";

const timestamp = "2026-08-03T18:00:00Z";

function team(index: number, name: string): Team {
  return {
    id: `a000000${index}-0000-4000-8000-00000000000${index}`,
    name,
    group_label: "A",
    final_rank: null,
  };
}

function completedMatch(
  index: number,
  team1: Team,
  team2: Team,
  winner: Team,
  sets: [number, number][] | null = [
    [6, 4],
    [6, 4],
  ],
  options: {
    decidingSetFormat?: "full_set" | "match_tiebreak";
    outcomeType?: "normal" | "retirement" | "walkover";
  } = {},
): MatchRecord {
  const outcomeType = options.outcomeType ?? "normal";

  return {
    id: `b000000${index}-0000-4000-8000-00000000000${index}`,
    code: `GA-${String(index).padStart(2, "0")}`,
    stage: "group",
    group_label: "A",
    label: null,
    team1_id: team1.id,
    team2_id: team2.id,
    status: "completed",
    scheduled_at: null,
    venue: null,
    deciding_set_format:
      outcomeType === "walkover"
        ? null
        : (options.decidingSetFormat ?? "full_set"),
    outcome_type: outcomeType,
    sets,
    winner_id: winner.id,
    played_at: timestamp,
    completed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function rowFor(
  standings: ReturnType<typeof calculateGroupStandings>,
  target: Team,
) {
  const row = standings.rows.find(
    (candidate) => candidate.team.id === target.id,
  );
  if (!row) {
    throw new Error(`Missing standing for ${target.name}.`);
  }
  return row;
}

describe("standings totals", () => {
  it("calculates played, wins, losses, sets, and games", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const standings = calculateGroupStandings(
      [alpha, bravo],
      [
        completedMatch(1, alpha, bravo, alpha, [
          [6, 4],
          [3, 6],
          [7, 5],
        ]),
      ],
      "A",
    );

    expect(rowFor(standings, alpha)).toMatchObject({
      rank: 1,
      played: 1,
      wins: 1,
      losses: 0,
      setsFor: 2,
      setsAgainst: 1,
      setDifference: 1,
      gamesFor: 16,
      gamesAgainst: 15,
      gameDifference: 1,
    });
    expect(rowFor(standings, bravo)).toMatchObject({
      rank: 2,
      played: 1,
      wins: 0,
      losses: 1,
      setsFor: 1,
      setsAgainst: 2,
      setDifference: -1,
      gamesFor: 15,
      gamesAgainst: 16,
      gameDifference: -1,
    });
  });

  it("counts a match tiebreak as a set but not as games", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const standings = calculateGroupStandings(
      [alpha, bravo],
      [
        completedMatch(
          1,
          alpha,
          bravo,
          alpha,
          [
            [6, 4],
            [3, 6],
            [12, 10],
          ],
          { decidingSetFormat: "match_tiebreak" },
        ),
      ],
      "A",
    );

    expect(rowFor(standings, alpha)).toMatchObject({
      setsFor: 2,
      setsAgainst: 1,
      gamesFor: 9,
      gamesAgainst: 10,
      gameDifference: -1,
    });
    expect(rowFor(standings, bravo)).toMatchObject({
      setsFor: 1,
      setsAgainst: 2,
      gamesFor: 10,
      gamesAgainst: 9,
      gameDifference: 1,
    });
  });

  it("counts exceptional wins and losses without any score differential", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(
          1,
          alpha,
          bravo,
          alpha,
          [
            [6, 4],
            [2, 2],
          ],
          { outcomeType: "retirement" },
        ),
        completedMatch(2, bravo, charlie, bravo, null, {
          outcomeType: "walkover",
        }),
      ],
      "A",
    );

    expect(rowFor(standings, alpha)).toMatchObject({
      played: 1,
      wins: 1,
      losses: 0,
      setsFor: 0,
      setsAgainst: 0,
      gamesFor: 0,
      gamesAgainst: 0,
    });
    expect(rowFor(standings, bravo)).toMatchObject({
      played: 2,
      wins: 1,
      losses: 1,
      setsFor: 0,
      setsAgainst: 0,
      gamesFor: 0,
      gamesAgainst: 0,
    });
  });
});

describe("two-team ties", () => {
  it("uses the completed head-to-head result before overall differentials", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(1, bravo, alpha, bravo, [
          [7, 6],
          [6, 7],
          [10, 8],
        ], { decidingSetFormat: "match_tiebreak" }),
        completedMatch(2, alpha, charlie, alpha, [
          [6, 0],
          [6, 0],
        ]),
      ],
      "A",
    );

    expect(standings.rows.map((row) => row.team.id)).toEqual([
      bravo.id,
      alpha.id,
      charlie.id,
    ]);
    expect(standings.provisional).toBe(false);
  });

  it("uses overall differences provisionally while head-to-head is missing", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(1, alpha, charlie, alpha, [
          [6, 0],
          [6, 0],
        ]),
        completedMatch(2, bravo, charlie, bravo, [
          [6, 4],
          [6, 4],
        ]),
      ],
      "A",
    );

    expect(standings.rows.slice(0, 2).map((row) => row.team.id)).toEqual([
      alpha.id,
      bravo.id,
    ]);
    expect(standings.rows.slice(0, 2).map((row) => row.setDifference)).toEqual([
      2, 2,
    ]);
    expect(standings.rows.slice(0, 2).map((row) => row.gameDifference)).toEqual([
      12, 4,
    ]);
    expect(standings.provisional).toBe(true);
  });

  it("returns a provisional unresolved tie when fallback metrics are equal", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(1, alpha, charlie, alpha),
        completedMatch(2, bravo, charlie, bravo),
      ],
      "A",
    );

    expect(rowFor(standings, alpha).rank).toBe(1);
    expect(rowFor(standings, bravo).rank).toBe(1);
    expect(standings.provisional).toBe(true);
    expect(standings.unresolvedTies).toEqual([
      {
        rank: 1,
        teamIds: [alpha.id, bravo.id],
      },
    ]);
  });
});

describe("multi-team ties", () => {
  it("ranks a complete mini-table by mini-table wins first", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const delta = team(4, "Delta");
    const echo = team(5, "Echo");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie, delta, echo],
      [
        completedMatch(1, alpha, bravo, alpha),
        completedMatch(2, alpha, charlie, alpha),
        completedMatch(3, bravo, charlie, bravo),
        completedMatch(4, bravo, delta, bravo),
        completedMatch(5, charlie, delta, charlie),
        completedMatch(6, charlie, echo, charlie),
        completedMatch(7, delta, echo, delta),
      ],
      "A",
    );

    expect(standings.rows.slice(0, 3).map((row) => row.team.id)).toEqual([
      alpha.id,
      bravo.id,
      charlie.id,
    ]);
    expect(standings.rows.slice(0, 3).map((row) => row.wins)).toEqual([
      2, 2, 2,
    ]);
    expect(standings.provisional).toBe(false);
  });

  it("uses mini-table set difference before mini-table game difference", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const delta = team(4, "Delta");
    const echo = team(5, "Echo");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie, delta, echo],
      [
        completedMatch(1, alpha, bravo, alpha, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(2, bravo, charlie, bravo, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(3, charlie, alpha, charlie, [
          [6, 4],
          [4, 6],
          [6, 4],
        ]),
        completedMatch(4, alpha, delta, alpha, [
          [6, 4],
          [4, 6],
          [6, 4],
        ]),
        completedMatch(5, echo, alpha, echo),
        completedMatch(6, bravo, delta, bravo),
        completedMatch(7, echo, bravo, echo, [
          [6, 4],
          [4, 6],
          [6, 4],
        ]),
        completedMatch(8, charlie, delta, charlie),
        completedMatch(9, echo, charlie, echo, [
          [6, 4],
          [4, 6],
          [6, 4],
        ]),
      ],
      "A",
    );

    const tiedRows = standings.rows.filter((row) =>
      [alpha.id, bravo.id, charlie.id].includes(row.team.id),
    );
    expect(tiedRows.map((row) => row.team.id)).toEqual([
      alpha.id,
      bravo.id,
      charlie.id,
    ]);
    expect(tiedRows.map((row) => row.setDifference)).toEqual([
      0, 1, 0,
    ]);
  });

  it("uses mini-table game difference when mini-table sets remain tied", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(1, alpha, bravo, alpha, [
          [6, 0],
          [6, 0],
        ]),
        completedMatch(2, bravo, charlie, bravo, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(3, charlie, alpha, charlie, [
          [6, 4],
          [6, 4],
        ]),
      ],
      "A",
    );

    expect(standings.rows.map((row) => row.team.id)).toEqual([
      alpha.id,
      charlie.id,
      bravo.id,
    ]);
    expect(standings.rows.map((row) => row.gameDifference)).toEqual([
      8, 0, -8,
    ]);
  });

  it("falls back to overall differences after equal mini-table metrics", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const delta = team(4, "Delta");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie, delta],
      [
        completedMatch(1, alpha, bravo, alpha, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(2, bravo, charlie, bravo, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(3, charlie, alpha, charlie, [
          [6, 4],
          [6, 4],
        ]),
        completedMatch(4, alpha, delta, alpha, [
          [6, 0],
          [6, 0],
        ]),
        completedMatch(5, bravo, delta, bravo, [
          [6, 2],
          [6, 2],
        ]),
        completedMatch(6, charlie, delta, charlie, [
          [6, 4],
          [6, 4],
        ]),
      ],
      "A",
    );

    expect(standings.rows.slice(0, 3).map((row) => row.team.id)).toEqual([
      alpha.id,
      bravo.id,
      charlie.id,
    ]);
    expect(standings.rows.slice(0, 3).map((row) => row.gameDifference)).toEqual([
      12, 8, 4,
    ]);
  });

  it("uses overall differences provisionally while the mini-table is incomplete", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const delta = team(4, "Delta");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie, delta],
      [
        completedMatch(1, alpha, delta, alpha, [
          [6, 0],
          [6, 0],
        ]),
        completedMatch(2, bravo, delta, bravo, [
          [6, 2],
          [6, 2],
        ]),
        completedMatch(3, charlie, delta, charlie, [
          [6, 4],
          [6, 4],
        ]),
      ],
      "A",
    );

    expect(standings.rows.slice(0, 3).map((row) => row.team.id)).toEqual([
      alpha.id,
      bravo.id,
      charlie.id,
    ]);
    expect(standings.provisional).toBe(true);
  });

  it("returns an explicit unresolved group when every rule remains equal", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");
    const charlie = team(3, "Charlie");
    const standings = calculateGroupStandings(
      [alpha, bravo, charlie],
      [
        completedMatch(1, alpha, bravo, alpha),
        completedMatch(2, bravo, charlie, bravo),
        completedMatch(3, charlie, alpha, charlie),
      ],
      "A",
    );

    expect(standings.rows.map((row) => row.rank)).toEqual([1, 1, 1]);
    expect(standings.unresolvedTies).toEqual([
      {
        rank: 1,
        teamIds: [alpha.id, bravo.id, charlie.id],
      },
    ]);
    expect(standings.provisional).toBe(false);
  });
});

describe("standings data integrity", () => {
  it("rejects malformed completed normal scores instead of miscounting them", () => {
    const alpha = team(1, "Alpha");
    const bravo = team(2, "Bravo");

    expect(() =>
      calculateGroupStandings(
        [alpha, bravo],
        [
          completedMatch(1, alpha, bravo, alpha, [
            [6, 4],
          ]),
        ],
        "A",
      ),
    ).toThrow(DataIntegrityError);
  });
});
