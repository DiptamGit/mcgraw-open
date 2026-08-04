import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  organizeKnockoutBracket,
  type KnockoutMatchCode,
} from "@/lib/bracket";
import type { Team, TournamentMatch } from "@/lib/data/schema";

import { KnockoutBracket } from "./knockout-bracket";

const groupATeam: Team = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Net Results - Ranjit / Venu C",
  group_label: "A",
  final_rank: 1,
};

const groupBTeam: Team = {
  id: "b0000004-0000-4000-8000-000000000004",
  name: "Drop Shot Society - Giri / Srini",
  group_label: "B",
  final_rank: 4,
};

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

describe("KnockoutBracket", () => {
  it("renders empty, assigned, scheduled, and completed states together", () => {
    const matches = [
      knockoutMatch("QF1", 1, {
        team1_id: groupATeam.id,
        team1: groupATeam,
      }),
      knockoutMatch("QF2", 2, {
        team1_id: groupATeam.id,
        team2_id: groupBTeam.id,
        team1: groupATeam,
        team2: groupBTeam,
        status: "scheduled",
        scheduled_at: "2026-09-12T20:30:00+00:00",
        venue: "McGraw Park · Court 2",
      }),
      knockoutMatch("QF3", 3),
      knockoutMatch("QF4", 4),
      knockoutMatch("SF1", 5, {
        team1_id: groupATeam.id,
        team2_id: groupBTeam.id,
        team1: groupATeam,
        team2: groupBTeam,
        status: "completed",
        deciding_set_format: "match_tiebreak",
        outcome_type: "normal",
        sets: [
          [6, 4],
          [3, 6],
          [10, 8],
        ],
        winner_id: groupATeam.id,
        winner: groupATeam,
        played_at: "2026-09-20T20:30:00+00:00",
        completed_at: "2026-09-20T22:00:00+00:00",
      }),
      knockoutMatch("SF2", 6),
      knockoutMatch("Final", 7),
    ];
    const markup = renderToStaticMarkup(
      <KnockoutBracket rounds={organizeKnockoutBracket(matches)} />,
    );

    expect(markup.match(/class="match-summary"/g)).toHaveLength(7);
    expect(markup).toContain("Quarterfinals");
    expect(markup).toContain("Semifinals");
    expect(markup).toContain("Championship match");
    expect(markup.indexOf("QF1")).toBeLessThan(markup.indexOf("QF4"));
    expect(markup.indexOf("QF4")).toBeLessThan(markup.indexOf("SF1"));
    expect(markup.indexOf("SF2")).toBeLessThan(markup.indexOf("Final"));

    expect(markup).toContain(groupATeam.name);
    expect(markup).toContain("bracket-source");
    expect(markup).toContain(">A1<");
    expect(markup).toContain(">B4<");
    expect(markup).toContain("Winner QF1");
    expect(markup).toContain("Winner QF2");

    expect(markup).toContain("Scheduled");
    expect(markup).toContain("Sep 12, 2026 · 3:30 PM CDT");
    expect(markup).toContain("McGraw Park · Court 2");
    expect(markup).toContain(">MTB<");
    expect(markup).toContain("score-display__mtb");
    expect(markup).toContain("Winner");
    expect(markup).toContain("Played");
  });

  it("renders every typed bracket code exactly once as a card", () => {
    const matches = [
      ...BRACKET_ROUND_CODES.quarterfinals,
      ...BRACKET_ROUND_CODES.semifinals,
      ...BRACKET_ROUND_CODES.final,
    ].map((code, index) => knockoutMatch(code, index + 1));
    const markup = renderToStaticMarkup(
      <KnockoutBracket rounds={organizeKnockoutBracket(matches)} />,
    );

    for (const match of matches) {
      expect(markup).toContain(`id="match-${match.id}"`);
    }
  });

  it("shows progression controls only to organizers", () => {
    const matches = [
      ...BRACKET_ROUND_CODES.quarterfinals,
      ...BRACKET_ROUND_CODES.semifinals,
      ...BRACKET_ROUND_CODES.final,
    ].map((code, index) => knockoutMatch(code, index + 1));
    const rounds = organizeKnockoutBracket(matches);
    const publicMarkup = renderToStaticMarkup(
      <KnockoutBracket rounds={rounds} />,
    );
    const organizerMarkup = renderToStaticMarkup(
      <KnockoutBracket isOrganizer rounds={rounds} />,
    );

    expect(publicMarkup).not.toContain("Manage SF1 teams");
    expect(organizerMarkup).toContain("Manage SF1 teams");
    expect(organizerMarkup).toContain("Manage SF2 teams");
    expect(organizerMarkup).toContain("Manage Final teams");
    expect(organizerMarkup).not.toContain("Manage QF1 teams");
  });
});
