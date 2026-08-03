import { DataIntegrityError } from "../data/errors";
import type { MatchRecord, Team } from "../data/schema";
import { validateNormalScore } from "../matches/result";

type GroupLabel = Team["group_label"];

type StandingStats = {
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
};

type StandingEntry = StandingStats & {
  team: Team;
  sourceIndex: number;
};

export type StandingRow = StandingStats & {
  rank: number;
  team: Team;
  setDifference: number;
  gameDifference: number;
};

export type UnresolvedTie = {
  rank: number;
  teamIds: string[];
};

export type GroupStandings = {
  groupLabel: GroupLabel;
  rows: StandingRow[];
  provisional: boolean;
  unresolvedTies: UnresolvedTie[];
};

type RankingMetric = (entry: StandingEntry) => number;

function emptyStats(): StandingStats {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    setsFor: 0,
    setsAgainst: 0,
    gamesFor: 0,
    gamesAgainst: 0,
  };
}

function setDifference(entry: StandingStats): number {
  return entry.setsFor - entry.setsAgainst;
}

function gameDifference(entry: StandingStats): number {
  return entry.gamesFor - entry.gamesAgainst;
}

function pairKey(team1Id: string, team2Id: string): string {
  return [team1Id, team2Id].sort().join(":");
}

function applyCompletedMatch(
  match: MatchRecord,
  entriesById: Map<string, StandingEntry>,
): void {
  if (!match.team1_id || !match.team2_id || !match.winner_id) {
    throw new DataIntegrityError(
      `Completed group match ${match.code} is missing a team or winner.`,
    );
  }

  const team1 = entriesById.get(match.team1_id);
  const team2 = entriesById.get(match.team2_id);
  if (!team1 || !team2) {
    throw new DataIntegrityError(
      `Group match ${match.code} references a team outside its group.`,
    );
  }

  const winner =
    match.winner_id === match.team1_id
      ? team1
      : match.winner_id === match.team2_id
        ? team2
        : null;
  if (!winner) {
    throw new DataIntegrityError(
      `Completed group match ${match.code} has an invalid winner.`,
    );
  }

  const loser = winner === team1 ? team2 : team1;
  team1.played += 1;
  team2.played += 1;
  winner.wins += 1;
  loser.losses += 1;

  if (
    match.outcome_type === "retirement" ||
    match.outcome_type === "walkover"
  ) {
    return;
  }

  if (
    match.outcome_type !== "normal" ||
    !match.sets ||
    !match.deciding_set_format
  ) {
    throw new DataIntegrityError(
      `Completed group match ${match.code} has incomplete score data.`,
    );
  }

  const validation = validateNormalScore({
    sets: match.sets,
    decidingSetFormat: match.deciding_set_format,
    winnerSide:
      match.winner_id === match.team1_id ? "team1" : "team2",
  });
  if (!validation.success) {
    throw new DataIntegrityError(
      `Completed group match ${match.code} has an invalid normal score.`,
      { cause: new Error(validation.message) },
    );
  }

  for (const [index, [team1Score, team2Score]] of match.sets.entries()) {
    if (team1Score > team2Score) {
      team1.setsFor += 1;
      team2.setsAgainst += 1;
    } else {
      team2.setsFor += 1;
      team1.setsAgainst += 1;
    }

    const isMatchTiebreak =
      index === 2 && match.deciding_set_format === "match_tiebreak";
    if (!isMatchTiebreak) {
      team1.gamesFor += team1Score;
      team1.gamesAgainst += team2Score;
      team2.gamesFor += team2Score;
      team2.gamesAgainst += team1Score;
    }
  }
}

function sortAndPartition(
  entries: StandingEntry[],
  metrics: RankingMetric[],
): StandingEntry[][] {
  const sorted = [...entries].sort((left, right) => {
    for (const metric of metrics) {
      const difference = metric(right) - metric(left);
      if (difference !== 0) {
        return difference;
      }
    }

    return left.sourceIndex - right.sourceIndex;
  });

  const groups: StandingEntry[][] = [];
  for (const entry of sorted) {
    const previousGroup = groups.at(-1);
    const previous = previousGroup?.[0];
    const isTied =
      previous !== undefined &&
      metrics.every((metric) => metric(entry) === metric(previous));

    if (isTied && previousGroup) {
      previousGroup.push(entry);
    } else {
      groups.push([entry]);
    }
  }

  return groups;
}

function hasCompleteMiniTable(
  entries: StandingEntry[],
  matchesByPair: Map<string, MatchRecord>,
): boolean {
  for (let first = 0; first < entries.length; first += 1) {
    for (let second = first + 1; second < entries.length; second += 1) {
      if (
        !matchesByPair.has(
          pairKey(entries[first].team.id, entries[second].team.id),
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function calculateMiniTable(
  entries: StandingEntry[],
  matchesByPair: Map<string, MatchRecord>,
): Map<string, StandingEntry> {
  const miniEntries = new Map(
    entries.map((entry) => [
      entry.team.id,
      {
        team: entry.team,
        sourceIndex: entry.sourceIndex,
        ...emptyStats(),
      },
    ]),
  );

  for (let first = 0; first < entries.length; first += 1) {
    for (let second = first + 1; second < entries.length; second += 1) {
      const match = matchesByPair.get(
        pairKey(entries[first].team.id, entries[second].team.id),
      );
      if (!match) {
        throw new DataIntegrityError(
          "Cannot calculate an incomplete standings mini-table.",
        );
      }
      applyCompletedMatch(match, miniEntries);
    }
  }

  return miniEntries;
}

function resolveWinsTie(
  entries: StandingEntry[],
  matchesByPair: Map<string, MatchRecord>,
): { groups: StandingEntry[][]; provisional: boolean } {
  const overallMetrics: RankingMetric[] = [
    setDifference,
    gameDifference,
  ];

  if (entries.length === 2) {
    const headToHead = matchesByPair.get(
      pairKey(entries[0].team.id, entries[1].team.id),
    );
    if (!headToHead) {
      return {
        groups: sortAndPartition(entries, overallMetrics),
        provisional: true,
      };
    }

    const winner = entries.find(
      (entry) => entry.team.id === headToHead.winner_id,
    );
    const loser = entries.find((entry) => entry !== winner);
    if (!winner || !loser) {
      throw new DataIntegrityError(
        `Completed group match ${headToHead.code} has an invalid winner.`,
      );
    }

    return { groups: [[winner], [loser]], provisional: false };
  }

  if (!hasCompleteMiniTable(entries, matchesByPair)) {
    return {
      groups: sortAndPartition(entries, overallMetrics),
      provisional: true,
    };
  }

  const miniTable = calculateMiniTable(entries, matchesByPair);
  const miniMetric =
    (metric: RankingMetric): RankingMetric =>
    (entry) => {
      const miniEntry = miniTable.get(entry.team.id);
      if (!miniEntry) {
        throw new DataIntegrityError(
          `The standings mini-table is missing ${entry.team.name}.`,
        );
      }
      return metric(miniEntry);
    };

  return {
    groups: sortAndPartition(entries, [
      miniMetric((entry) => entry.wins),
      miniMetric(setDifference),
      miniMetric(gameDifference),
      ...overallMetrics,
    ]),
    provisional: false,
  };
}

export function calculateGroupStandings(
  teams: readonly Team[],
  matches: readonly MatchRecord[],
  groupLabel: GroupLabel,
): GroupStandings {
  const groupTeams = teams.filter(
    (team) => team.group_label === groupLabel,
  );
  const entries = groupTeams.map<StandingEntry>((team, sourceIndex) => ({
    team,
    sourceIndex,
    ...emptyStats(),
  }));
  const entriesById = new Map(entries.map((entry) => [entry.team.id, entry]));
  if (entriesById.size !== entries.length) {
    throw new DataIntegrityError(
      `Group ${groupLabel} contains duplicate team records.`,
    );
  }

  const matchesByPair = new Map<string, MatchRecord>();
  for (const match of matches) {
    if (
      match.stage !== "group" ||
      match.group_label !== groupLabel ||
      match.status !== "completed"
    ) {
      continue;
    }

    applyCompletedMatch(match, entriesById);
    if (!match.team1_id || !match.team2_id) {
      throw new DataIntegrityError(
        `Completed group match ${match.code} is missing a team.`,
      );
    }

    const key = pairKey(match.team1_id, match.team2_id);
    if (matchesByPair.has(key)) {
      throw new DataIntegrityError(
        `Group ${groupLabel} contains duplicate completed matches for one pairing.`,
      );
    }
    matchesByPair.set(key, match);
  }

  const winsGroups = sortAndPartition(entries, [
    (entry) => entry.wins,
  ]);
  const rankedGroups: StandingEntry[][] = [];
  let provisional = false;

  for (const winsGroup of winsGroups) {
    if (winsGroup.length === 1) {
      rankedGroups.push(winsGroup);
      continue;
    }

    const resolution = resolveWinsTie(winsGroup, matchesByPair);
    rankedGroups.push(...resolution.groups);
    provisional ||= resolution.provisional;
  }

  const rows: StandingRow[] = [];
  const unresolvedTies: UnresolvedTie[] = [];
  let rank = 1;

  for (const rankedGroup of rankedGroups) {
    if (rankedGroup.length > 1) {
      unresolvedTies.push({
        rank,
        teamIds: rankedGroup.map((entry) => entry.team.id),
      });
    }

    for (const entry of rankedGroup) {
      rows.push({
        rank,
        team: entry.team,
        played: entry.played,
        wins: entry.wins,
        losses: entry.losses,
        setsFor: entry.setsFor,
        setsAgainst: entry.setsAgainst,
        setDifference: setDifference(entry),
        gamesFor: entry.gamesFor,
        gamesAgainst: entry.gamesAgainst,
        gameDifference: gameDifference(entry),
      });
    }

    rank += rankedGroup.length;
  }

  return {
    groupLabel,
    rows,
    provisional,
    unresolvedTies,
  };
}
