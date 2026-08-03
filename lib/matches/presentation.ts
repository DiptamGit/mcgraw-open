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
  scheduled: TournamentMatch[];
  unscheduled: TournamentMatch[];
  completed: TournamentMatch[];
};

export type MatchGroupFilter = "all" | "A" | "B";
export type MatchStageFilter = "all" | TournamentMatch["stage"];

export type MatchFilterSelection = {
  group: MatchGroupFilter;
  stage: MatchStageFilter;
};

export type MatchSearchParams = Record<
  string,
  string | string[] | undefined
>;

const stageOrder: Record<TournamentMatch["stage"], number> = {
  group: 0,
  quarterfinal: 1,
  semifinal: 2,
  final: 3,
};

function isGroupFilter(value: string): value is Exclude<MatchGroupFilter, "all"> {
  return value === "A" || value === "B";
}

function isStageFilter(value: string): value is Exclude<MatchStageFilter, "all"> {
  return (
    value === "group" ||
    value === "quarterfinal" ||
    value === "semifinal" ||
    value === "final"
  );
}

export function parseMatchFilters(
  searchParams: MatchSearchParams,
): MatchFilterSelection {
  const groupParam = searchParams.group;
  const stageParam = searchParams.stage;

  return {
    group:
      typeof groupParam === "string" && isGroupFilter(groupParam)
        ? groupParam
        : "all",
    stage:
      typeof stageParam === "string" && isStageFilter(stageParam)
        ? stageParam
        : "all",
  };
}

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

  const playedTime = new Date(match.played_at).getTime();

  if (Number.isNaN(playedTime)) {
    throw new DataIntegrityError(
      `Completed match ${match.code} has an invalid played time.`,
    );
  }

  return playedTime;
}

function getScheduledTime(match: TournamentMatch): number {
  if (match.scheduled_at === null) {
    throw new DataIntegrityError(
      `Scheduled match ${match.code} is missing its scheduled time.`,
    );
  }

  const scheduledTime = new Date(match.scheduled_at).getTime();

  if (Number.isNaN(scheduledTime)) {
    throw new DataIntegrityError(
      `Scheduled match ${match.code} has an invalid scheduled time.`,
    );
  }

  return scheduledTime;
}

function compareByStageAndCode(
  first: TournamentMatch,
  second: TournamentMatch,
): number {
  return (
    stageOrder[first.stage] - stageOrder[second.stage] ||
    first.code.localeCompare(second.code, "en", { numeric: true })
  );
}

export function organizeMatches(
  matches: TournamentMatch[],
  filters: MatchFilterSelection = { group: "all", stage: "all" },
): MatchSections {
  const filteredMatches = matches.filter(
    (match) =>
      (filters.group === "all" || match.group_label === filters.group) &&
      (filters.stage === "all" || match.stage === filters.stage),
  );

  const scheduledMatches = filteredMatches.filter(
    (match) => match.status === "scheduled",
  );

  scheduledMatches.forEach(getScheduledTime);

  const scheduled = scheduledMatches
    .toSorted(
      (first, second) =>
        getScheduledTime(first) - getScheduledTime(second) ||
        first.code.localeCompare(second.code, "en", { numeric: true }),
    );

  const unscheduled = filteredMatches
    .filter((match) => match.status === "unscheduled")
    .toSorted(compareByStageAndCode);

  const completedMatches = filteredMatches.filter(
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

  return { scheduled, unscheduled, completed };
}
