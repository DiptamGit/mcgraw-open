import { describe, expect, it } from "vitest";

import type { Team, TournamentMatch } from "../data/schema";
import type {
  GroupStandings,
  StandingRow,
} from "../standings/calculate";
import { getGroupLeaders } from "../standings/presentation";
import {
  HOME_UPCOMING_MATCH_LIMIT,
  getUpcomingMatches,
} from "./presentation";

const teams: Team[] = [1, 2, 3].map((index) => ({
  id: `a000000${index}-0000-4000-8000-00000000000${index}`,
  name: `Team ${index}`,
  group_label: "A",
  final_rank: null,
}));

function createMatch(
  index: number,
  scheduledAt: string | null,
): TournamentMatch {
  return {
    id: `b000000${index}-0000-4000-8000-00000000000${index}`,
    code: `GA-0${index}`,
    stage: "group",
    group_label: "A",
    label: null,
    team1_id: teams[0].id,
    team2_id: teams[1].id,
    status: scheduledAt ? "scheduled" : "unscheduled",
    scheduled_at: scheduledAt,
    venue: scheduledAt ? "Court 1" : null,
    deciding_set_format: null,
    outcome_type: null,
    sets: null,
    winner_id: null,
    played_at: null,
    completed_at: null,
    created_at: "2026-08-01T19:00:00+00:00",
    updated_at: "2026-08-01T19:00:00+00:00",
    team1: teams[0],
    team2: teams[1],
    winner: null,
  };
}

function standingRow(
  index: number,
  overrides: Partial<StandingRow> = {},
): StandingRow {
  return {
    rank: index,
    team: teams[index - 1],
    played: 2,
    wins: 3 - index,
    losses: index - 1,
    setsFor: 4,
    setsAgainst: index,
    setDifference: 4 - index,
    gamesFor: 24,
    gamesAgainst: 18 + index,
    gameDifference: 6 - index,
    ...overrides,
  };
}

function standings(rows: StandingRow[]): GroupStandings {
  return {
    groupLabel: "A",
    rows,
    provisional: false,
    unresolvedTies: [],
  };
}

describe("home presentation", () => {
  it("returns an empty upcoming list when no matches are scheduled", () => {
    expect(getUpcomingMatches([createMatch(1, null)])).toEqual([]);
  });

  it("uses match-page ordering and limits an active schedule", () => {
    const upcoming = getUpcomingMatches([
      createMatch(1, "2026-08-08T19:00:00+00:00"),
      createMatch(2, "2026-08-03T19:00:00+00:00"),
      createMatch(3, "2026-08-05T19:00:00+00:00"),
    ]);

    expect(upcoming).toHaveLength(HOME_UPCOMING_MATCH_LIMIT);
    expect(upcoming.map((match) => match.code)).toEqual(["GA-02", "GA-03"]);
  });

  it("does not name a leader before a group has a completed result", () => {
    expect(
      getGroupLeaders(
        standings([
          standingRow(1, { rank: 1 }),
          standingRow(2, { rank: 1 }),
        ]),
        "open",
        0,
      ),
    ).toEqual([]);
  });

  it("keeps joint live leaders returned by the standings engine", () => {
    const rows = [
      standingRow(1, { rank: 1 }),
      standingRow(2, { rank: 1 }),
      standingRow(3, { rank: 3 }),
    ];

    expect(getGroupLeaders(standings(rows), "open", 1)).toEqual(rows.slice(0, 2));
  });

  it("uses the locked rank-one team after finalization", () => {
    const rows = [
      standingRow(1, { team: { ...teams[0], final_rank: 3 } }),
      standingRow(2, { team: { ...teams[1], final_rank: 1 } }),
      standingRow(3, { team: { ...teams[2], final_rank: 2 } }),
    ];

    expect(
      getGroupLeaders(standings(rows), "finalized", 3).map(
        (row) => row.team.name,
      ),
    ).toEqual(["Team 2"]);
  });
});
