import {
  CheckCircle,
  Clock,
  MapPin,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { getBracketSourceLabel } from "../../lib/bracket";
import type { TournamentMatch } from "../../lib/data/schema";
import {
  formatTournamentDateTime,
  getMatchStageLabel,
  getMatchStatusLabel,
  getOutcomeLabel,
  getTeamDisplayName,
  type MatchSide,
} from "../../lib/matches/presentation";
import type { ResultEditability } from "../../lib/matches/result";
import { ScoreDisplay } from "./score-display";
import { TeamName } from "./team-name";

type MatchSummaryProps = {
  canSchedule?: boolean;
  match: TournamentMatch;
  resultEditability?: ResultEditability;
  showBracketSources?: boolean;
};

const statusIcons = {
  scheduled: Clock,
  completed: CheckCircle,
  unscheduled: null,
} as const;

function MatchStatusBadge({ status }: { status: TournamentMatch["status"] }) {
  const Icon = statusIcons[status];

  return (
    <span className={`status-badge status-badge--${status}`}>
      {Icon ? <Icon size={14} weight="fill" aria-hidden="true" /> : null}
      {getMatchStatusLabel(status)}
    </span>
  );
}

function MatchTeam({
  match,
  side,
  showBracketSources,
}: {
  match: TournamentMatch;
  side: MatchSide;
  showBracketSources: boolean;
}) {
  const teamId = side === "team1" ? match.team1_id : match.team2_id;
  const isWinner = match.winner_id !== null && match.winner_id === teamId;

  return (
    <div
      className={`match-teams__team match-teams__team--${side}${
        isWinner ? " is-winner" : ""
      }`}
    >
      {showBracketSources && teamId !== null ? (
        <span className="bracket-source">
          {getBracketSourceLabel(match.code, side)}
        </span>
      ) : null}
      <TeamName name={getTeamDisplayName(match, side)} />
      {isWinner ? <span className="winner-label">Winner</span> : null}
    </div>
  );
}

function MatchTeams({
  match,
  showBracketSources,
}: {
  match: TournamentMatch;
  showBracketSources: boolean;
}) {
  return (
    <div className="match-teams">
      <MatchTeam
        match={match}
        side="team1"
        showBracketSources={showBracketSources}
      />
      <span className="match-teams__versus" aria-hidden="true">
        VS
      </span>
      <MatchTeam
        match={match}
        side="team2"
        showBracketSources={showBracketSources}
      />
    </div>
  );
}

function MatchMeta({ match }: { match: TournamentMatch }) {
  const isCompleted = match.status === "completed";
  const timestamp = isCompleted ? match.played_at : match.scheduled_at;
  const timeLabel = isCompleted ? "Played" : "Starts";

  if (timestamp === null && match.venue === null) {
    return null;
  }

  return (
    <ul className="match-summary__meta">
      {timestamp !== null ? (
        <li>
          <Clock size={14} weight="bold" aria-hidden="true" />
          <span>
            {timeLabel}{" "}
            <time className="figure" dateTime={timestamp}>
              {formatTournamentDateTime(timestamp)}
            </time>
          </span>
        </li>
      ) : null}
      {match.venue !== null ? (
        <li>
          <MapPin size={14} weight="bold" aria-hidden="true" />
          <span>
            <span className="sr-only">Court </span>
            {match.venue}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

export function MatchSummary({
  canSchedule = false,
  match,
  resultEditability,
  showBracketSources = false,
}: MatchSummaryProps) {
  const team1Name = getTeamDisplayName(match, "team1");
  const team2Name = getTeamDisplayName(match, "team2");
  const outcomeLabel = getOutcomeLabel(match.outcome_type);
  const hasScore = Boolean(match.sets?.length);
  const showScheduleLink = canSchedule && match.status !== "completed";
  const showActions = showScheduleLink || Boolean(resultEditability);

  return (
    <article className="match-summary" aria-labelledby={`match-${match.id}`}>
      <h3 className="sr-only" id={`match-${match.id}`}>
        {match.code}: {team1Name} versus {team2Name}
      </h3>

      <div className="match-summary__header">
        <p className="match-summary__context">
          <span>{getMatchStageLabel(match)}</span>
          <span aria-hidden="true">·</span>
          <span className="figure">{match.code}</span>
        </p>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="match-summary__competition">
        {hasScore && showBracketSources ? (
          <p
            className="bracket-source-path"
            aria-label={`Bracket sources: ${getBracketSourceLabel(match.code, "team1")} versus ${getBracketSourceLabel(match.code, "team2")}`}
          >
            <span className="bracket-source">
              {getBracketSourceLabel(match.code, "team1")}
            </span>
            <span aria-hidden="true">vs</span>
            <span className="bracket-source">
              {getBracketSourceLabel(match.code, "team2")}
            </span>
          </p>
        ) : null}
        {hasScore ? (
          <ScoreDisplay match={match} />
        ) : (
          <MatchTeams match={match} showBracketSources={showBracketSources} />
        )}
        {outcomeLabel ? (
          <p className="outcome-label">
            <Warning size={14} weight="fill" aria-hidden="true" />
            {outcomeLabel}
          </p>
        ) : null}
      </div>

      <MatchMeta match={match} />

      {showActions ? (
        <div className="match-summary__actions">
          {showScheduleLink ? (
            <Link
              className="btn btn--outline btn--sm"
              href={`/matches/${encodeURIComponent(match.code)}/schedule`}
            >
              {match.status === "scheduled" ? "Reschedule" : "Schedule match"}
            </Link>
          ) : null}
          {resultEditability?.editable ? (
            <Link
              className="btn btn--court btn--sm"
              href={`/matches/${encodeURIComponent(match.code)}/result`}
            >
              {match.status === "completed" ? "Edit result" : "Record result"}
            </Link>
          ) : resultEditability ? (
            <p className="match-result-lock">
              <strong>Result locked.</strong> {resultEditability.reason}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
