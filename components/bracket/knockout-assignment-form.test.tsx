import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  BRACKET_MAPPING,
  type KnockoutMatchCode,
} from "@/lib/bracket";
import type { Team, TournamentMatch } from "@/lib/data/schema";

import { KnockoutAssignmentForm } from "./knockout-assignment-form";

vi.mock("server-only", () => ({}));

const timestamp = "2026-08-04T17:00:00Z";
const team: Team = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Net Results",
  group_label: "A",
  final_rank: 1,
};

function knockoutMatch(
  code: KnockoutMatchCode,
  index: number,
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
  };
}

describe("KnockoutAssignmentForm", () => {
  it("presents the completed winner as the default assignment choice", () => {
    const markup = renderToStaticMarkup(
      <KnockoutAssignmentForm
        downstreamMatch={knockoutMatch("SF1", 5)}
        initialState={{ status: "idle", message: null }}
        intent="assign"
        sourceMatch={knockoutMatch("QF1", 1)}
        team={team}
        teamSlot="team1_id"
      />,
    );

    expect(markup).toContain("Eligible winner (required)");
    expect(markup).toContain(team.name);
    expect(markup).toContain('name="teamId"');
    expect(markup).toContain('checked=""');
    expect(markup).toContain('name="expectedSourceUpdatedAt"');
    expect(markup).toContain("Review assignment");
  });

  it("renders a deliberate clear action without another team choice", () => {
    const markup = renderToStaticMarkup(
      <KnockoutAssignmentForm
        downstreamMatch={knockoutMatch("Final", 7)}
        initialState={{ status: "idle", message: null }}
        intent="clear"
        sourceMatch={knockoutMatch("SF1", 5)}
        team={team}
        teamSlot="team1_id"
      />,
    );

    expect(markup).toContain('type="hidden" name="teamId"');
    expect(markup).toContain("Clear assignment");
    expect(markup).not.toContain("Eligible winner");
  });
});
