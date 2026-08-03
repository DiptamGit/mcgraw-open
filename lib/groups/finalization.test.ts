import { describe, expect, it } from "vitest";

import type {
  TournamentData,
} from "@/lib/data/queries";
import type {
  Team,
  TournamentMatch,
} from "@/lib/data/schema";
import {
  createFinalizationFormState,
  createFinalizationPreview,
  resolveFinalRankings,
} from "./finalization";

const timestamp = "2026-08-03T18:00:00Z";

const teams: Team[] = [
  {
    id: "a0000001-0000-4000-8000-000000000001",
    name: "Alpha",
    group_label: "A",
    final_rank: null,
  },
  {
    id: "a0000002-0000-4000-8000-000000000002",
    name: "Bravo",
    group_label: "A",
    final_rank: null,
  },
  {
    id: "a0000003-0000-4000-8000-000000000003",
    name: "Charlie",
    group_label: "A",
    final_rank: null,
  },
  {
    id: "b0000001-0000-4000-8000-000000000001",
    name: "Delta",
    group_label: "B",
    final_rank: null,
  },
  {
    id: "b0000002-0000-4000-8000-000000000002",
    name: "Echo",
    group_label: "B",
    final_rank: null,
  },
];

function completedMatch(
  index: number,
  team1: Team,
  team2: Team,
  winner: Team,
): TournamentMatch {
  return {
    id: `c000000${index}-0000-4000-8000-00000000000${index}`,
    code: `G${team1.group_label}-${String(index).padStart(2, "0")}`,
    stage: "group",
    group_label: team1.group_label,
    label: null,
    team1_id: team1.id,
    team2_id: team2.id,
    status: "completed",
    scheduled_at: null,
    venue: null,
    deciding_set_format: "full_set",
    outcome_type: "normal",
    sets: [
      [6, 4],
      [6, 4],
    ],
    winner_id: winner.id,
    played_at: timestamp,
    completed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    team1,
    team2,
    winner,
  };
}

function tournament(): TournamentData {
  return {
    teams,
    matches: [
      completedMatch(1, teams[0], teams[1], teams[0]),
      completedMatch(2, teams[1], teams[2], teams[1]),
      completedMatch(3, teams[2], teams[0], teams[2]),
      completedMatch(4, teams[3], teams[4], teams[3]),
    ],
    state: {
      id: 1,
      group_stage_status: "open",
      groups_finalized_at: null,
      tie_resolution_note: null,
      updated_at: timestamp,
    },
  };
}

describe("group finalization preview", () => {
  it("identifies complete fixtures and exact ties without inventing an order", () => {
    const preview = createFinalizationPreview(tournament());

    expect(preview).toMatchObject({
      allMatchesComplete: true,
      completedMatches: 4,
      totalMatches: 4,
    });
    expect(preview.ties).toHaveLength(1);
    expect(preview.ties[0]).toMatchObject({
      groupLabel: "A",
      rank: 1,
      teamIds: [teams[0].id, teams[1].id, teams[2].id],
    });
    expect(createFinalizationFormState(preview).values.manualOrders).toEqual({
      [preview.ties[0].key]: [
        teams[0].id,
        teams[1].id,
        teams[2].id,
      ],
    });
  });

  it("marks the preview incomplete while any group result is missing", () => {
    const data = tournament();
    data.matches[0] = {
      ...data.matches[0],
      status: "unscheduled",
      deciding_set_format: null,
      outcome_type: null,
      sets: null,
      winner_id: null,
      winner: null,
      played_at: null,
      completed_at: null,
    };

    expect(createFinalizationPreview(data)).toMatchObject({
      allMatchesComplete: false,
      completedMatches: 3,
      totalMatches: 4,
    });
  });
});

describe("manual final-rank resolution", () => {
  it("allows only tied teams to be ordered and assigns consecutive ranks", () => {
    const preview = createFinalizationPreview(tournament());
    const tie = preview.ties[0];
    const resolution = resolveFinalRankings(
      preview,
      {
        [tie.key]: [teams[2].id, teams[0].id, teams[1].id],
      },
      "The organizer used a witnessed random draw.",
    );

    expect(resolution).toEqual({
      success: true,
      rankings: expect.arrayContaining([
        { team_id: teams[2].id, final_rank: 1 },
        { team_id: teams[0].id, final_rank: 2 },
        { team_id: teams[1].id, final_rank: 3 },
        { team_id: teams[3].id, final_rank: 1 },
        { team_id: teams[4].id, final_rank: 2 },
      ]),
      tieResolutionNote: "The organizer used a witnessed random draw.",
    });
  });

  it("requires a reason for every unresolved exact tie", () => {
    const preview = createFinalizationPreview(tournament());
    const resolution = resolveFinalRankings(
      preview,
      {
        [preview.ties[0].key]: preview.ties[0].teamIds,
      },
      "   ",
    );

    expect(resolution).toMatchObject({
      success: false,
      fieldErrors: {
        tieResolutionNote: expect.stringContaining("reason"),
      },
    });
  });

  it("rejects missing, duplicated, or unrelated teams in a manual order", () => {
    const preview = createFinalizationPreview(tournament());
    const resolution = resolveFinalRankings(
      preview,
      {
        [preview.ties[0].key]: [
          teams[0].id,
          teams[0].id,
          teams[3].id,
        ],
      },
      "A reason",
    );

    expect(resolution).toMatchObject({
      success: false,
      fieldErrors: {
        manualOrders: expect.stringContaining("Review"),
      },
    });
  });
});
