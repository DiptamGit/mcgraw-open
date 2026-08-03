import { DataIntegrityError } from "../data/errors";
import type { TournamentState } from "../data/schema";
import type {
  GroupStandings,
  StandingRow,
} from "./calculate";

export function getDisplayedStandingsRows(
  standings: GroupStandings,
  tournamentStatus: TournamentState["group_stage_status"],
): StandingRow[] {
  if (tournamentStatus !== "finalized") {
    return standings.rows;
  }

  const ranks = standings.rows.map((row) => row.team.final_rank);
  const expectedRanks = new Set(
    standings.rows.map((_, index) => index + 1),
  );

  if (
    ranks.some((rank) => rank === null || !expectedRanks.has(rank)) ||
    new Set(ranks).size !== standings.rows.length
  ) {
    throw new DataIntegrityError(
      "Finalized standings are missing a complete set of group ranks.",
    );
  }

  return [...standings.rows]
    .sort((left, right) => {
      if (left.team.final_rank === null || right.team.final_rank === null) {
        throw new DataIntegrityError(
          "Finalized standings contain an empty group rank.",
        );
      }
      return left.team.final_rank - right.team.final_rank;
    })
    .map((row) => {
      if (row.team.final_rank === null) {
        throw new DataIntegrityError(
          "Finalized standings contain an empty group rank.",
        );
      }
      return { ...row, rank: row.team.final_rank };
    });
}

export function getGroupLeaders(
  standings: GroupStandings,
  tournamentStatus: TournamentState["group_stage_status"],
  completedMatches: number,
): StandingRow[] {
  if (completedMatches === 0) {
    return [];
  }

  return getDisplayedStandingsRows(standings, tournamentStatus).filter(
    (row) => row.rank === 1,
  );
}
