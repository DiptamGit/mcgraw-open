import { BRACKET_MAPPING, type KnockoutMatchCode } from "../bracket";
import { DataIntegrityError } from "../data/errors";
import type { TournamentMatch } from "../data/schema";

export const TOURNAMENT_TIME_ZONE = "America/Chicago";

const tournamentDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TOURNAMENT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const tournamentTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TOURNAMENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export type MatchSide = "team1" | "team2";

export type MatchSections = {
  fixtures: TournamentMatch[];
  completed: TournamentMatch[];
};

const stageOrder: Record<TournamentMatch["stage"], number> = {
  group: 0,
  quarterfinal: 1,
  semifinal: 2,
  final: 3,
};

export function formatTournamentDateTime(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new DataIntegrityError(
      "A match contains an invalid tournament timestamp.",
    );
  }

  return `${tournamentDateFormatter.format(date)} · ${tournamentTimeFormatter.format(date)}`;
}

export function getMatchStageLabel(match: TournamentMatch): string {
  switch (match.stage) {
    case "group":
      return `Group ${match.group_label}`;
    case "quarterfinal":
      return "Quarterfinal";
    case "semifinal":
      return "Semifinal";
    case "final":
      return "Final";
  }
}

export function getMatchStatusLabel(
  status: TournamentMatch["status"],
): string {
  switch (status) {
    case "unscheduled":
      return "Unscheduled";
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
  }
}

export function getOutcomeLabel(
  outcome: TournamentMatch["outcome_type"],
): string | null {
  switch (outcome) {
    case "retirement":
      return "Retirement";
    case "walkover":
      return "Walkover";
    case "normal":
    case null:
      return null;
  }
}

function isKnockoutMatchCode(code: string): code is KnockoutMatchCode {
  return Object.hasOwn(BRACKET_MAPPING, code);
}

function getKnockoutPlaceholder(
  match: TournamentMatch,
  side: MatchSide,
): string {
  if (!isKnockoutMatchCode(match.code)) {
    throw new DataIntegrityError(
      `Knockout match ${match.code} has no bracket source mapping.`,
    );
  }

  const definition = BRACKET_MAPPING[match.code];
  const source =
    side === "team1" ? definition.team1Source : definition.team2Source;

  if (source.type === "group-rank") {
    return `${source.group}${source.rank}`;
  }

  return `Winner ${source.matchCode}`;
}

export function getTeamDisplayName(
  match: TournamentMatch,
  side: MatchSide,
): string {
  const team = side === "team1" ? match.team1 : match.team2;

  if (team) {
    return team.name;
  }

  if (match.stage !== "group") {
    return getKnockoutPlaceholder(match, side);
  }

  throw new DataIntegrityError(
    `Group match ${match.code} is missing an assigned team.`,
  );
}

function getCompletedPlayedTime(match: TournamentMatch): number {
  if (match.played_at === null) {
    throw new DataIntegrityError(
      `Completed match ${match.code} is missing its played time.`,
    );
  }

  return new Date(match.played_at).getTime();
}

export function partitionMatches(
  matches: TournamentMatch[],
): MatchSections {
  const fixtures = matches
    .filter((match) => match.status !== "completed")
    .toSorted(
      (first, second) =>
        stageOrder[first.stage] - stageOrder[second.stage] ||
        first.code.localeCompare(second.code, "en", { numeric: true }),
    );

  const completedMatches = matches.filter(
    (match) => match.status === "completed",
  );

  completedMatches.forEach(getCompletedPlayedTime);

  const completed = completedMatches.toSorted((first, second) => {
      const playedTimeDifference =
        getCompletedPlayedTime(second) - getCompletedPlayedTime(first);

      return (
        playedTimeDifference ||
        first.code.localeCompare(second.code, "en", { numeric: true })
      );
    });

  return { fixtures, completed };
}
