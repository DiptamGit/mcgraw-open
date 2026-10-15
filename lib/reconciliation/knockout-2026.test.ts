import { describe, expect, it } from "vitest";

import { BRACKET_MAPPING, DOWNSTREAM_ASSIGNMENTS, type KnockoutMatchCode } from "../bracket";
import { matchRecordSchema, type TournamentSnapshot } from "../data/schema";
import { seedQuarterfinalWinners } from "../knockout-seeding";
import {
  approvedQuarterfinals,
  createReconciliationPreview,
  expectedGroupFixtures,
  OFFICIAL_TEAMS,
  RECONCILIATION_EVIDENCE,
} from "./knockout-2026";

const now = "2026-10-15T02:00:00Z";
const eligible = OFFICIAL_TEAMS.filter((team) => team.rank <= 4).map((team) => team.id);

function baseline(): TournamentSnapshot {
  const matches = approvedQuarterfinals(now);
  const blank = matches[0];
  return {
    teams: OFFICIAL_TEAMS.map((team) => ({
      id: team.id, name: team.name, group_label: team.group, final_rank: null,
    })),
    matches: [
      ...expectedGroupFixtures().map((fixture) => ({
        ...blank,
        ...fixture,
        stage: "group" as const,
      })),
      ...(["QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "Final"] as const).map((code, index) =>
        matchRecordSchema.parse({
          ...blank, id: `c1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          code, stage: BRACKET_MAPPING[code].stage, label: BRACKET_MAPPING[code].label,
          status: "unscheduled", team1_id: null, team2_id: null,
          scheduled_at: null, venue: null, sets: null, winner_id: null,
          outcome_type: null, deciding_set_format: null, played_at: null, completed_at: null,
        }),
      ),
    ],
    state: { id: 1, group_stage_status: "open", groups_finalized_at: null, tie_resolution_note: null, updated_at: now },
  };
}

describe("approved 2026 knockout evidence", () => {
  it("orients every result to the stable QF sides and converts Central Time", () => {
    const results = approvedQuarterfinals(now);
    expect(results.map((match) => match.sets)).toEqual([
      [[6, 4], [2, 6], [2, 6]], [[6, 7], [6, 7]], [[6, 1], [7, 6]], [[3, 6], [2, 6]],
    ]);
    expect(results.map((match) => match.played_at)).toEqual([
      "2026-10-13T23:00:00Z", "2026-10-13T23:00:00Z",
      "2026-10-13T23:00:00Z", "2026-10-14T22:00:00Z",
    ]);
    expect(results.every((match) => match.completed_at === now && match.venue === "BHS" &&
      match.scheduled_at === match.played_at && match.deciding_set_format === "full_set")).toBe(true);
    expect(RECONCILIATION_EVIDENCE.tiebreaks).toHaveLength(3);
    expect(RECONCILIATION_EVIDENCE.decidingSetQualification).toContain("administrative");
  });

  it("ranks exact set/game fractions without counting tiebreak points as games", () => {
    const seeds = seedQuarterfinalWinners(approvedQuarterfinals(now), eligible);
    expect(seeds.map((seed) => [seed.sourceCode, seed.setsWon, seed.setsPlayed, seed.gamesWon, seed.gamesPlayed])).toEqual([
      ["QF4", 2, 2, 12, 17], ["QF3", 2, 2, 13, 20],
      ["QF2", 2, 2, 14, 26], ["QF1", 2, 3, 16, 26],
    ]);
    expect(seedQuarterfinalWinners(approvedQuarterfinals(now).toReversed(), eligible)).toEqual(seeds);
  });

  it("previews the exact official order and mapped semifinals without changing the baseline", () => {
    const snapshot = baseline();
    const original = structuredClone(snapshot);
    const preview = createReconciliationPreview(snapshot, now);
    expect(snapshot).toEqual(original);
    expect(preview.groupMatchesChanged).toBe(0);
    expect(preview.semifinals.map((match) => match.sources)).toEqual([["QF4", "QF1"], ["QF3", "QF2"]]);
    expect(OFFICIAL_TEAMS.filter((team) => team.group === "B").map((team) => team.name.split(" - ")[0])).toEqual([
      "Drop Shot Society", "Spin Doctors", "Baseline Bandits", "Court Jesters", "Rally Rascals", "Racquet Scientists",
    ]);
    for (const semifinal of preview.semifinals) {
      const code = semifinal.code as "SF1" | "SF2";
      expect(BRACKET_MAPPING[code].team1Source.matchCode).toBe(semifinal.sources[0]);
      expect(BRACKET_MAPPING[code].team2Source.matchCode).toBe(semifinal.sources[1]);
    }
    for (const seed of preview.seeds) {
      const code = seed.sourceCode as Exclude<KnockoutMatchCode, "SF1" | "SF2" | "Final">;
      expect(DOWNSTREAM_ASSIGNMENTS[code].matchCode).toBe(seed.seed === 1 || seed.seed === 4 ? "SF1" : "SF2");
    }
  });

  it("rejects incomplete, stale-shaped, or active knockout baselines", () => {
    const snapshot = baseline();
    snapshot.matches[0].status = "unscheduled";
    expect(() => createReconciliationPreview(snapshot, now)).toThrow("baseline");
    const active = baseline();
    active.matches[30].team1_id = eligible[0];
    expect(() => createReconciliationPreview(active, now)).toThrow("baseline");
    const renamed = baseline();
    renamed.teams[0].name = "Unexpected team";
    expect(() => createReconciliationPreview(renamed, now)).toThrow("baseline");
    const changedFixture = baseline();
    changedFixture.matches[0].code = "GA-99";
    expect(() => createReconciliationPreview(changedFixture, now)).toThrow("baseline");
    expect(expectedGroupFixtures().filter((match) => match.group_label === "A")).toHaveLength(15);
    expect(expectedGroupFixtures().find((match) => match.code === "GA-11")).toMatchObject({
      team1_id: "a0000001-0000-4000-8000-000000000001",
      team2_id: "a0000006-0000-4000-8000-000000000006",
    });
    expect(() => approvedQuarterfinals("2026-10-01T00:00:00Z")).toThrow("future");
  });

  it("rejects missing, duplicated, exceptional, invalid, ineligible, and exactly tied evidence", () => {
    expect(() => seedQuarterfinalWinners(approvedQuarterfinals(now).slice(1), eligible)).toThrow("four");
    const cases = [
      { outcome_type: "walkover" as const },
      { sets: [[6, 6], [6, 4]] as [number, number][] },
      { winner_id: "b0000005-0000-4000-8000-000000000005" },
      { deciding_set_format: "match_tiebreak" as const },
      { code: "QF5" },
    ];
    for (const change of cases) {
      const matches = approvedQuarterfinals(now);
      matches[0] = { ...matches[0], ...change };
      expect(() => seedQuarterfinalWinners(matches, eligible)).toThrow();
    }
    const tied = approvedQuarterfinals(now);
    tied[1].sets = [[4, 6], [4, 6]];
    tied[2].sets = [[6, 4], [6, 4]];
    expect(() => seedQuarterfinalWinners(tied, eligible)).toThrow("Exact");
    const duplicated = approvedQuarterfinals(now);
    duplicated[1] = { ...duplicated[0] };
    expect(() => seedQuarterfinalWinners(duplicated, eligible)).toThrow("four");
  });
});
