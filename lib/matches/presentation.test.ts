import { describe, expect, it } from "vitest";

import { DataIntegrityError } from "../data/errors";
import type { TournamentMatch } from "../data/schema";
import {
  formatTournamentDateTime,
  getMatchStageLabel,
  getOutcomeLabel,
  getTeamDisplayName,
  organizeMatches,
  parseMatchFilters,
} from "./presentation";

const groupATeam: TournamentMatch["team1"] = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Baseline Bandits - Player One / Player Two",
  group_label: "A",
  final_rank: null,
};

const groupBTeam: TournamentMatch["team2"] = {
  id: "b0000001-0000-4000-8000-000000000001",
  name: "Volley Llamas - Player Three / Player Four",
  group_label: "B",
  final_rank: null,
};

function createMatch(
  overrides: Partial<TournamentMatch> = {},
): TournamentMatch {
  return {
    id: "a1000000-0000-4000-8000-000000000001",
    code: "GA-01",
    stage: "group",
    group_label: "A",
    label: null,
    team1_id: groupATeam.id,
    team2_id: groupBTeam.id,
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
    team1: groupATeam,
    team2: groupBTeam,
    winner: null,
    ...overrides,
  };
}

describe("match presentation", () => {
  it("formats Central Time on both sides of a calendar boundary", () => {
    expect(formatTournamentDateTime("2026-08-02T04:30:00+00:00")).toBe(
      "Aug 1, 2026 · 11:30 PM CDT",
    );
    expect(formatTournamentDateTime("2026-08-02T05:30:00+00:00")).toBe(
      "Aug 2, 2026 · 12:30 AM CDT",
    );
  });

  it("formats the repeated daylight-saving hour with an explicit zone", () => {
    expect(formatTournamentDateTime("2026-11-01T06:30:00+00:00")).toBe(
      "Nov 1, 2026 · 1:30 AM CDT",
    );
    expect(formatTournamentDateTime("2026-11-01T07:30:00+00:00")).toBe(
      "Nov 1, 2026 · 1:30 AM CST",
    );
  });

  it("uses explicit bracket sources for unassigned knockout teams", () => {
    const quarterfinal = createMatch({
      code: "QF1",
      stage: "quarterfinal",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });
    const semifinal = createMatch({
      code: "SF2",
      stage: "semifinal",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });

    expect(getMatchStageLabel(quarterfinal)).toBe("Quarterfinal");
    expect(getTeamDisplayName(quarterfinal, "team1")).toBe("A1");
    expect(getTeamDisplayName(quarterfinal, "team2")).toBe("B4");
    expect(getTeamDisplayName(semifinal, "team1")).toBe("Winner QF3");
    expect(getTeamDisplayName(semifinal, "team2")).toBe("Winner QF4");
  });

  it("labels only exceptional outcomes", () => {
    expect(getOutcomeLabel("normal")).toBeNull();
    expect(getOutcomeLabel("retirement")).toBe("Retirement");
    expect(getOutcomeLabel("walkover")).toBe("Walkover");
  });

  it("orders completed matches by played time rather than save time", () => {
    const newerPlayedMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000002",
      code: "GA-02",
      status: "completed",
      outcome_type: "normal",
      sets: [
        [6, 4],
        [6, 3],
      ],
      winner_id: groupATeam.id,
      winner: groupATeam,
      played_at: "2026-08-08T18:00:00+00:00",
      completed_at: "2026-08-08T19:00:00+00:00",
    });
    const laterSavedMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000003",
      code: "GA-03",
      status: "completed",
      outcome_type: "walkover",
      winner_id: groupBTeam.id,
      winner: groupBTeam,
      played_at: "2026-08-07T18:00:00+00:00",
      completed_at: "2026-08-09T19:00:00+00:00",
    });

    expect(
      organizeMatches([laterSavedMatch, newerPlayedMatch]).completed.map(
        (match) => match.code,
      ),
    ).toEqual(["GA-02", "GA-03"]);
  });

  it("orders scheduled matches by court time across past and future dates", () => {
    const pastMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000004",
      code: "GA-04",
      status: "scheduled",
      scheduled_at: "2026-08-01T18:00:00+00:00",
    });
    const nearerFutureMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000005",
      code: "GA-05",
      status: "scheduled",
      scheduled_at: "2026-08-04T18:00:00+00:00",
    });
    const laterFutureMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000006",
      code: "GA-06",
      status: "scheduled",
      scheduled_at: "2026-08-10T18:00:00+00:00",
    });

    expect(
      organizeMatches([
        laterFutureMatch,
        nearerFutureMatch,
        pastMatch,
      ]).scheduled.map((match) => match.code),
    ).toEqual(["GA-04", "GA-05", "GA-06"]);
  });

  it("keeps unscheduled matches in tournament stage order", () => {
    const final = createMatch({
      id: "a1000000-0000-4000-8000-000000000007",
      code: "Final",
      stage: "final",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });
    const quarterfinal = createMatch({
      id: "a1000000-0000-4000-8000-000000000008",
      code: "QF1",
      stage: "quarterfinal",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });

    expect(
      organizeMatches([final, quarterfinal, createMatch()]).unscheduled.map(
        (match) => match.code,
      ),
    ).toEqual(["GA-01", "QF1", "Final"]);
  });

  it("filters by each group and knockout stage", () => {
    const groupBMatch = createMatch({
      id: "a1000000-0000-4000-8000-000000000009",
      code: "GB-01",
      group_label: "B",
    });
    const quarterfinal = createMatch({
      id: "a1000000-0000-4000-8000-000000000010",
      code: "QF1",
      stage: "quarterfinal",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });
    const semifinal = createMatch({
      id: "a1000000-0000-4000-8000-000000000011",
      code: "SF1",
      stage: "semifinal",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });
    const final = createMatch({
      id: "a1000000-0000-4000-8000-000000000012",
      code: "Final",
      stage: "final",
      group_label: null,
      team1_id: null,
      team2_id: null,
      team1: null,
      team2: null,
    });
    const matches = [createMatch(), groupBMatch, quarterfinal, semifinal, final];

    expect(
      organizeMatches(matches, { group: "A", stage: "all" }).unscheduled.map(
        (match) => match.code,
      ),
    ).toEqual(["GA-01"]);
    expect(
      organizeMatches(matches, { group: "B", stage: "all" }).unscheduled.map(
        (match) => match.code,
      ),
    ).toEqual(["GB-01"]);
    expect(
      organizeMatches(matches, {
        group: "all",
        stage: "quarterfinal",
      }).unscheduled.map((match) => match.code),
    ).toEqual(["QF1"]);
    expect(
      organizeMatches(matches, {
        group: "all",
        stage: "semifinal",
      }).unscheduled.map((match) => match.code),
    ).toEqual(["SF1"]);
    expect(
      organizeMatches(matches, { group: "all", stage: "final" }).unscheduled.map(
        (match) => match.code,
      ),
    ).toEqual(["Final"]);
  });

  it("returns an empty result for incompatible filter combinations", () => {
    const sections = organizeMatches([createMatch()], {
      group: "A",
      stage: "quarterfinal",
    });

    expect(sections).toEqual({
      scheduled: [],
      unscheduled: [],
      completed: [],
    });
  });

  it("parses shareable filters and ignores invalid or repeated values", () => {
    expect(parseMatchFilters({ group: "A", stage: "quarterfinal" })).toEqual({
      group: "A",
      stage: "quarterfinal",
    });
    expect(
      parseMatchFilters({
        group: "unknown",
        stage: ["final", "semifinal"],
      }),
    ).toEqual({ group: "all", stage: "all" });
  });

  it("surfaces inconsistent completed and group match data", () => {
    expect(() =>
      organizeMatches([createMatch({ status: "completed" })]),
    ).toThrow(DataIntegrityError);
    expect(() =>
      organizeMatches([createMatch({ status: "scheduled" })]),
    ).toThrow("Scheduled match GA-01 is missing its scheduled time.");
    expect(() =>
      getTeamDisplayName(
        createMatch({ team1: null, team1_id: null }),
        "team1",
      ),
    ).toThrow("Group match GA-01 is missing an assigned team.");
  });
});
