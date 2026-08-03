import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  Team,
  TournamentMatch,
  TournamentState,
} from "@/lib/data/schema";

const getTournamentData = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/queries", () => ({ getTournamentData }));

import HomePage from "./page";

const tournamentState: TournamentState = {
  id: 1,
  group_stage_status: "open",
  groups_finalized_at: null,
  tie_resolution_note: null,
  updated_at: "2026-08-01T19:00:00+00:00",
};

function team(index: number, groupLabel: Team["group_label"] = "A"): Team {
  return {
    id: `a000000${index}-0000-4000-8000-00000000000${index}`,
    name: `Team ${index} / Partner ${index}`,
    group_label: groupLabel,
    final_rank: null,
  };
}

function match(
  index: number,
  team1: Team,
  team2: Team,
  overrides: Partial<TournamentMatch> = {},
): TournamentMatch {
  return {
    id: `b000000${index}-0000-4000-8000-00000000000${index}`,
    code: `GA-0${index}`,
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
    created_at: "2026-08-01T19:00:00+00:00",
    updated_at: "2026-08-01T19:00:00+00:00",
    team1,
    team2,
    winner: null,
    ...overrides,
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    getTournamentData.mockReset();
  });

  it("directs visitors to fixtures and avoids naming leaders with empty data", async () => {
    getTournamentData.mockResolvedValue({
      teams: [],
      matches: [],
      state: tournamentState,
    });

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain("No matches are scheduled yet.");
    expect(markup.match(/No leader yet\./g)).toHaveLength(2);
    expect(markup).toContain('href="/matches"');
    expect(markup).toContain('href="/groups"');
  });

  it("shows a partial group leader from the standings engine", async () => {
    const team1 = team(1);
    const team2 = team(2);
    const completed = match(1, team1, team2, {
      status: "completed",
      deciding_set_format: "full_set",
      outcome_type: "normal",
      sets: [
        [6, 4],
        [6, 3],
      ],
      winner_id: team1.id,
      played_at: "2026-08-02T00:30:00+00:00",
      completed_at: "2026-08-02T02:00:00+00:00",
      winner: team1,
    });
    getTournamentData.mockResolvedValue({
      teams: [team1, team2],
      matches: [completed],
      state: tournamentState,
    });

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain(team1.name);
    expect(markup).toContain("1 win");
    expect(markup.match(/No leader yet\./g)).toHaveLength(1);
  });

  it("renders the next two active matches in match-page order and Central Time", async () => {
    const team1 = team(1);
    const team2 = team(2);
    const scheduled = [
      match(3, team1, team2, {
        status: "scheduled",
        scheduled_at: "2026-08-10T19:00:00+00:00",
      }),
      match(4, team1, team2, {
        status: "scheduled",
        scheduled_at: "2026-08-03T19:00:00+00:00",
      }),
      match(5, team1, team2, {
        status: "scheduled",
        scheduled_at: "2026-08-05T19:00:00+00:00",
      }),
    ];
    getTournamentData.mockResolvedValue({
      teams: [team1, team2],
      matches: scheduled,
      state: tournamentState,
    });

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup.indexOf("GA-04")).toBeLessThan(markup.indexOf("GA-05"));
    expect(markup).not.toContain("GA-03");
    expect(markup).toContain("Aug 3, 2026 · 2:00 PM CDT");
    expect(markup).toContain("Aug 5, 2026 · 2:00 PM CDT");
  });
});
