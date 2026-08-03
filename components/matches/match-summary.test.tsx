import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TournamentMatch } from "../../lib/data/schema";
import type { ResultEditability } from "../../lib/matches/result";
import { MatchSummary } from "./match-summary";

const team1: TournamentMatch["team1"] = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Baseline Bandits - Player One / Player Two",
  group_label: "A",
  final_rank: null,
};

const team2: TournamentMatch["team2"] = {
  id: "a0000002-0000-4000-8000-000000000002",
  name: "Volley Llamas - Player Three / Player Four",
  group_label: "A",
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

describe("MatchSummary", () => {
  it("renders an unscheduled fixture without empty optional labels", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary match={createMatch()} />,
    );

    expect(markup).toContain("Unscheduled");
    expect(markup).toContain(team1.name);
    expect(markup).not.toContain("<dl");
    expect(markup).not.toContain("Venue");
  });

  it("shows schedule controls only for an unlocked editable match", () => {
    const unlockedMarkup = renderToStaticMarkup(
      <MatchSummary canSchedule match={createMatch()} />,
    );
    const lockedMarkup = renderToStaticMarkup(
      <MatchSummary match={createMatch()} />,
    );

    expect(unlockedMarkup).toContain("Schedule match");
    expect(unlockedMarkup).toContain("/matches/GA-01/schedule");
    expect(lockedMarkup).not.toContain("Schedule match");
  });

  it("shows result controls or an explicit lock reason in organizer mode", () => {
    const editable: ResultEditability = { editable: true };
    const locked: ResultEditability = {
      editable: false,
      reason: "Group standings are finalized.",
    };
    const editableMarkup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch()}
        resultEditability={editable}
      />,
    );
    const lockedMarkup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch()}
        resultEditability={locked}
      />,
    );

    expect(editableMarkup).toContain("Record result");
    expect(editableMarkup).toContain("/matches/GA-01/result");
    expect(lockedMarkup).toContain("Result locked.");
    expect(lockedMarkup).toContain("Group standings are finalized.");
  });

  it("renders a scheduled fixture in Central Time with its venue", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch({
          status: "scheduled",
          scheduled_at: "2026-08-02T00:30:00+00:00",
          venue: "McGraw Park · Court 2",
        })}
      />,
    );

    expect(markup).toContain("Scheduled");
    expect(markup).toContain("Aug 1, 2026 · 7:30 PM CDT");
    expect(markup).toContain("McGraw Park · Court 2");
  });

  it("distinguishes a deciding match tiebreak from full sets", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch({
          status: "completed",
          deciding_set_format: "match_tiebreak",
          outcome_type: "normal",
          sets: [
            [6, 4],
            [4, 6],
            [10, 8],
          ],
          winner_id: team1.id,
          winner: team1,
          played_at: "2026-08-02T00:30:00+00:00",
          completed_at: "2026-08-02T02:00:00+00:00",
        })}
      />,
    );

    expect(markup).toContain(">MTB<");
    expect(markup).toContain("score-display__mtb");
    expect(markup).toContain("Winner");
    expect(markup).toContain("Played");
  });

  it("shows a partial retirement score and explicit outcome", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch({
          status: "completed",
          deciding_set_format: "full_set",
          outcome_type: "retirement",
          sets: [
            [6, 4],
            [2, 1],
          ],
          winner_id: team1.id,
          winner: team1,
          played_at: "2026-08-02T00:30:00+00:00",
          completed_at: "2026-08-02T02:00:00+00:00",
        })}
      />,
    );

    expect(markup).toContain("Retirement");
    expect(markup).toContain("<table>");
  });

  it("shows a walkover winner without fabricating a score", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch({
          status: "completed",
          outcome_type: "walkover",
          winner_id: team2.id,
          winner: team2,
          played_at: "2026-08-02T00:30:00+00:00",
          completed_at: "2026-08-02T02:00:00+00:00",
        })}
      />,
    );

    expect(markup).toContain("Walkover");
    expect(markup).toContain("Winner");
    expect(markup).not.toContain("<table>");
  });

  it("renders explicit knockout placeholders when teams are unassigned", () => {
    const markup = renderToStaticMarkup(
      <MatchSummary
        match={createMatch({
          code: "Final",
          stage: "final",
          group_label: null,
          team1_id: null,
          team2_id: null,
          team1: null,
          team2: null,
        })}
      />,
    );

    expect(markup).toContain("Winner SF1");
    expect(markup).toContain("Winner SF2");
  });
});
