import type { TournamentMatch } from "../data/schema";
import { organizeMatches } from "../matches/presentation";

export const HOME_UPCOMING_MATCH_LIMIT = 2;

export function getUpcomingMatches(
  matches: TournamentMatch[],
): TournamentMatch[] {
  return organizeMatches(matches).scheduled.slice(
    0,
    HOME_UPCOMING_MATCH_LIMIT,
  );
}
