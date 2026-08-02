import { describe, expect, it } from "vitest";

import { DataIntegrityError } from "./errors";
import {
  normalizeMatches,
  parseMatchRecord,
  parseTournamentState,
  versionedMatchUpdateSchema,
  type MatchRecord,
  type Team,
} from "./schema";

const team: Team = {
  id: "a0000001-0000-4000-8000-000000000001",
  name: "Net Results - Ranjit / Venu C",
  group_label: "A",
  final_rank: null,
};

const match: MatchRecord = {
  id: "a1000000-0000-4000-8000-000000000001",
  code: "GA-01",
  stage: "group",
  group_label: "A",
  label: null,
  team1_id: team.id,
  team2_id: "a0000002-0000-4000-8000-000000000002",
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
};

describe("database record validation", () => {
  it("accepts a valid singleton tournament state", () => {
    expect(
      parseTournamentState({
        id: 1,
        group_stage_status: "open",
        groups_finalized_at: null,
        tie_resolution_note: null,
        updated_at: "2026-08-01T19:00:00+00:00",
      }),
    ).toMatchObject({ id: 1, group_stage_status: "open" });
  });

  it("rejects malformed score JSON", () => {
    expect(() =>
      parseMatchRecord({
        ...match,
        sets: [[6, "four"]],
      }),
    ).toThrow(DataIntegrityError);
  });

  it("surfaces missing team relationships during normalization", () => {
    expect(() => normalizeMatches([match], [team])).toThrow(
      "Match GA-01 references a missing team 2 team.",
    );
  });

  it("rejects invalid or empty versioned updates", () => {
    expect(() =>
      versionedMatchUpdateSchema.parse({
        id: "not-a-match-id",
        expectedUpdatedAt: match.updated_at,
        changes: {},
      }),
    ).toThrow();
  });
});
