import { z } from "zod";

import { BRACKET_MAPPING } from "../bracket";
import { DataIntegrityError } from "../data/errors";
import { matchRecordSchema, type MatchRecord, type TournamentSnapshot } from "../data/schema";
import { seedQuarterfinalWinners } from "../knockout-seeding";
import { parsePlayedAt } from "../matches/result";

export const RECONCILIATION_ID = "MGO-033";
const teamId = (group: "a" | "b", number: number) =>
  `${group}000000${number}-0000-4000-8000-${String(number).padStart(12, "0")}`;

export const OFFICIAL_TEAMS = z.array(z.object({
  id: z.uuid(),
  name: z.string().min(1),
  group: z.enum(["A", "B"]),
  rank: z.number().int().min(1).max(6),
  withdrawnName: z.string().optional(),
})).length(12).parse([
  { id: teamId("a", 6), name: "Fault Tolerant - Shankar / Mohan", group: "A", rank: 1 },
  { id: teamId("a", 3), name: "Deuce Detectives - Anindya / Damodhar", group: "A", rank: 2 },
  { id: teamId("a", 1), name: "Net Results - Ranjit / Venu C", group: "A", rank: 3 },
  { id: teamId("a", 4), name: "Lob Stars - Amit Anand / Kaushtab", group: "A", rank: 4 },
  { id: teamId("a", 2), name: "Volley Llamas - Kiran / Venu K", group: "A", rank: 5 },
  { id: teamId("a", 5), name: "Smash Potatoes - Withdrawn", group: "A", rank: 6 },
  { id: teamId("b", 4), name: "Drop Shot Society - Giri / Srini", group: "B", rank: 1 },
  { id: teamId("b", 3), name: "Spin Doctors - Nil / Kaushik", group: "B", rank: 2 },
  { id: teamId("b", 1), name: "Baseline Bandits - Prasad V / Srinivas", group: "B", rank: 3 },
  { id: teamId("b", 2), name: "Court Jesters - Amit Gupta / Jeet", group: "B", rank: 4 },
  { id: teamId("b", 5), name: "Rally Rascals - Arup / Diptam", group: "B", rank: 5, withdrawnName: "Rally Rascals - Withdrawn" },
  { id: teamId("b", 6), name: "Racquet Scientists - Venkat Goli / Bhavanth", group: "B", rank: 6, withdrawnName: "Racquet Scientists - Withdrawn" },
]);

export const RECONCILIATION_EVIDENCE = {
  officialOrderRuling:
    "Organizer-approved 2026 final group order supersedes automatic eligibility/order; withdrawn teams retain historical results but cannot advance. Group B places Baseline Bandits third and Court Jesters fourth by explicit organizer ruling.",
  seedingPolicy:
    "Quarterfinal set-win percentage, then game-win percentage; seed 1 vs 4 and 2 vs 3. Exact ties require an organizer ruling. No lottery or automatic reseeding.",
  decidingSetQualification:
    "Court Jesters played a full third set. full_set is the approved administrative value for the unused deciding set in the three straight-set matches.",
  scheduleQualification:
    "Confirmed played start times are also backfilled as scheduled_at to retain the BHS venue under the existing constraint.",
  tiebreaks: [
    { code: "QF2", winnerId: teamId("b", 1), set: 1, points: [7, 1] },
    { code: "QF2", winnerId: teamId("b", 1), set: 2, points: [7, 4] },
    { code: "QF3", winnerId: teamId("a", 1), set: 2, points: [7, 4] },
  ],
} as const;

export function expectedGroupFixtures() {
  return (["A", "B"] as const).flatMap((group) => {
    const teams = OFFICIAL_TEAMS.filter((team) => team.group === group)
      .toSorted((first, second) => first.id.localeCompare(second.id));
    const originalTeams = group === "A" ? teams.slice(0, 5) : teams;
    const pairs = originalTeams.flatMap((first, index) =>
      originalTeams.slice(index + 1).map((second) => [first.id, second.id]),
    );
    if (group === "A") {
      pairs.push(...originalTeams.map((team) => [team.id, teams[5].id]));
    }
    return pairs.map(([team1_id, team2_id], index) => ({
      id: `${group.toLowerCase()}1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      code: `G${group}-${String(index + 1).padStart(2, "0")}`,
      group_label: group,
      team1_id,
      team2_id,
    }));
  });
}

export function approvedQuarterfinals(now = new Date().toISOString()): MatchRecord[] {
  return [
    { code: "QF1", team1_id: teamId("a", 6), team2_id: teamId("b", 2), winner_id: teamId("b", 2), sets: [[6, 4], [2, 6], [2, 6]], date: "2026-10-13", time: "18:00" },
    { code: "QF2", team1_id: teamId("a", 3), team2_id: teamId("b", 1), winner_id: teamId("b", 1), sets: [[6, 7], [6, 7]], date: "2026-10-13", time: "18:00" },
    { code: "QF3", team1_id: teamId("a", 1), team2_id: teamId("b", 3), winner_id: teamId("a", 1), sets: [[6, 1], [7, 6]], date: "2026-10-13", time: "18:00" },
    { code: "QF4", team1_id: teamId("a", 4), team2_id: teamId("b", 4), winner_id: teamId("b", 4), sets: [[3, 6], [2, 6]], date: "2026-10-14", time: "17:00" },
  ].map((result, index) => {
    const played = parsePlayedAt(result.date, result.time, now);
    if (!played.success) throw new DataIntegrityError(played.message);
    const code = z.enum(["QF1", "QF2", "QF3", "QF4"]).parse(result.code);
    return matchRecordSchema.parse({
      id: `c1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      code,
      stage: "quarterfinal",
      group_label: null,
      label: BRACKET_MAPPING[code].label,
      team1_id: result.team1_id,
      team2_id: result.team2_id,
      status: "completed",
      scheduled_at: played.timestamp,
      venue: "BHS",
      deciding_set_format: "full_set",
      outcome_type: "normal",
      sets: result.sets,
      winner_id: result.winner_id,
      played_at: played.timestamp,
      completed_at: now,
      created_at: now,
      updated_at: now,
    });
  });
}

export function createReconciliationPreview(
  snapshot: TournamentSnapshot,
  now = new Date().toISOString(),
) {
  if (
    snapshot.teams.length !== 12 ||
    snapshot.matches.length !== 37 ||
    new Set(snapshot.matches.map((match) => match.id)).size !== 37 ||
    snapshot.state.group_stage_status !== "open" ||
    OFFICIAL_TEAMS.some((expected) => !snapshot.teams.some((team) =>
      team.id === expected.id && team.name === expected.name &&
      team.group_label === expected.group && team.final_rank === null,
    )) ||
    snapshot.matches.filter((match) => match.stage === "group" && match.status === "completed").length !== 30 ||
    expectedGroupFixtures().some((expected) => !snapshot.matches.some((match) =>
      match.id === expected.id && match.code === expected.code &&
      match.group_label === expected.group_label && match.stage === "group" &&
      match.team1_id === expected.team1_id && match.team2_id === expected.team2_id,
    )) ||
    (["QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "Final"] as const).some((code, index) =>
      !snapshot.matches.some((match) =>
        match.code === code && match.stage === BRACKET_MAPPING[code].stage &&
        match.id === `c1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ),
    ) ||
    snapshot.matches.some((match) => match.stage !== "group" && (
      match.status !== "unscheduled" || match.team1_id || match.team2_id ||
      match.scheduled_at || match.venue || match.winner_id || match.sets ||
      match.played_at || match.completed_at || match.outcome_type || match.deciding_set_format
    ))
  ) {
    throw new DataIntegrityError("Reconciliation baseline changed or group results are incomplete.");
  }
  const quarterfinals = approvedQuarterfinals(now);
  const seeds = seedQuarterfinalWinners(
    quarterfinals,
    OFFICIAL_TEAMS.filter((team) => team.rank <= 4).map((team) => team.id),
  );
  return {
    reconciliationId: RECONCILIATION_ID,
    expectedSnapshot: snapshot,
    officialTeams: OFFICIAL_TEAMS,
    quarterfinals,
    seeds,
    semifinals: [
      { code: "SF1", team1_id: seeds[0].teamId, team2_id: seeds[3].teamId, sources: [seeds[0].sourceCode, seeds[3].sourceCode] },
      { code: "SF2", team1_id: seeds[1].teamId, team2_id: seeds[2].teamId, sources: [seeds[1].sourceCode, seeds[2].sourceCode] },
    ],
    evidence: RECONCILIATION_EVIDENCE,
    groupMatchesChanged: 0,
  };
}
