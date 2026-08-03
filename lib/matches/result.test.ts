import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import type {
  TournamentMatch,
  TournamentState,
} from "../data/schema";
import {
  createResultFormState,
  getResultEditability,
  parsePlayedAt,
  validateNormalScore,
} from "./result";

const team1Id = "a0000001-0000-4000-8000-000000000001";
const team2Id = "a0000002-0000-4000-8000-000000000002";

function match(
  overrides: Partial<TournamentMatch> = {},
): TournamentMatch {
  return {
    id: "a1000000-0000-4000-8000-000000000001",
    code: "GA-01",
    stage: "group",
    group_label: "A",
    label: null,
    team1_id: team1Id,
    team2_id: team2Id,
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
    team1: {
      id: team1Id,
      name: "Team One",
      group_label: "A",
      final_rank: null,
    },
    team2: {
      id: team2Id,
      name: "Team Two",
      group_label: "A",
      final_rank: null,
    },
    winner: null,
    ...overrides,
  };
}

const openState: TournamentState = {
  id: 1,
  group_stage_status: "open",
  groups_finalized_at: null,
  tie_resolution_note: null,
  updated_at: "2026-08-01T19:00:00Z",
};

describe("normal score validation", () => {
  it("accepts representative straight-set and full-set deciding results", () => {
    expect(
      validateNormalScore({
        sets: [
          [6, 4],
          [7, 6],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team1",
      }),
    ).toMatchObject({ success: true });

    expect(
      validateNormalScore({
        sets: [
          [6, 3],
          [4, 6],
          [7, 5],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team1",
      }),
    ).toMatchObject({ success: true });
  });

  it("accepts a match tiebreak only when it is won from 10 by two", () => {
    expect(
      validateNormalScore({
        sets: [
          [6, 2],
          [3, 6],
          [12, 10],
        ],
        decidingSetFormat: "match_tiebreak",
        winnerSide: "team1",
      }),
    ).toMatchObject({ success: true });

    expect(
      validateNormalScore({
        sets: [
          [6, 2],
          [3, 6],
          [10, 9],
        ],
        decidingSetFormat: "match_tiebreak",
        winnerSide: "team1",
      }),
    ).toMatchObject({
      success: false,
      setIndex: 2,
      message: "A match tiebreak is first to 10 points by two.",
    });

    expect(
      validateNormalScore({
        sets: [
          [6, 2],
          [3, 6],
          [11, 8],
        ],
        decidingSetFormat: "match_tiebreak",
        winnerSide: "team1",
      }),
    ).toMatchObject({
      success: false,
      setIndex: 2,
      message: "A match tiebreak is first to 10 points by two.",
    });
  });

  it("rejects ties, incomplete matches, extra sets, and winner mismatches", () => {
    expect(
      validateNormalScore({
        sets: [
          [6, 6],
          [6, 4],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team1",
      }),
    ).toMatchObject({ success: false, setIndex: 0 });

    expect(
      validateNormalScore({
        sets: [
          [6, 4],
          [4, 6],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team1",
      }),
    ).toMatchObject({
      success: false,
      message: "Enter the deciding third set after the teams split two sets.",
    });

    expect(
      validateNormalScore({
        sets: [
          [6, 4],
          [6, 3],
          [6, 2],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team1",
      }),
    ).toMatchObject({ success: false, setIndex: 2 });

    expect(
      validateNormalScore({
        sets: [
          [6, 4],
          [6, 3],
        ],
        decidingSetFormat: "full_set",
        winnerSide: "team2",
      }),
    ).toMatchObject({ success: false, winnerError: true });
  });
});

describe("result timing and locks", () => {
  it("prefills played time from the schedule or current Central Time", () => {
    expect(
      createResultFormState(
        match({ scheduled_at: "2026-08-04T00:30:00Z" }),
      ).values,
    ).toMatchObject({
      playedDate: "2026-08-03",
      playedTime: "19:30",
    });

    expect(
      createResultFormState(
        match(),
        "idle",
        null,
        DateTime.fromISO("2026-08-03T17:45:00Z"),
      ).values,
    ).toMatchObject({
      playedDate: "2026-08-03",
      playedTime: "12:45",
    });
  });

  it("rejects a future played time", () => {
    expect(
      parsePlayedAt(
        "2026-08-03",
        "19:31",
        "2026-08-04T00:30:00Z",
      ),
    ).toEqual({
      success: false,
      message: "Played time cannot be in the future.",
    });
  });

  it("locks finalized group results and assigned knockout winners", () => {
    expect(
      getResultEditability(match(), [], {
        ...openState,
        group_stage_status: "finalized",
        groups_finalized_at: "2026-09-30T20:00:00Z",
      }),
    ).toMatchObject({ editable: false });

    const quarterfinal = match({
      code: "QF1",
      stage: "quarterfinal",
      group_label: null,
    });
    const semifinal = match({
      id: "a1000000-0000-4000-8000-000000000002",
      code: "SF1",
      stage: "semifinal",
      group_label: null,
      team1_id: team1Id,
    });

    expect(
      getResultEditability(
        quarterfinal,
        [quarterfinal, semifinal],
        openState,
      ),
    ).toEqual({
      editable: false,
      reason: "This result is locked because its winner is assigned to SF1.",
    });
  });
});
