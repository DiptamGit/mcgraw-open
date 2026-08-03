import type { TournamentMatch } from "../../lib/data/schema";
import {
  formatTournamentDateTime,
  getMatchStageLabel,
  getMatchStatusLabel,
  getOutcomeLabel,
  getTeamDisplayName,
} from "../../lib/matches/presentation";
import { ScoreDisplay } from "./score-display";

type MatchSummaryProps = {
  match: TournamentMatch;
};

function MatchTeams({ match }: MatchSummaryProps) {
  return (
    <div className="match-teams">
      {(["team1", "team2"] as const).map((side, index) => {
        const teamId = side === "team1" ? match.team1_id : match.team2_id;
        const isWinner = match.winner_id !== null && match.winner_id === teamId;

        return (
          <div
            className={`match-teams__team${isWinner ? " is-winner" : ""}`}
            key={side}
          >
            <span>{getTeamDisplayName(match, side)}</span>
            {isWinner ? <span className="winner-label">Winner</span> : null}
            {index === 0 ? (
              <span className="match-teams__versus" aria-hidden="true">
                vs
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MatchSummary({ match }: MatchSummaryProps) {
  const team1Name = getTeamDisplayName(match, "team1");
  const team2Name = getTeamDisplayName(match, "team2");
  const outcomeLabel = getOutcomeLabel(match.outcome_type);
  const hasScore = Boolean(match.sets?.length);
  const hasDetails = Boolean(
    (match.status === "completed" && match.played_at) ||
      match.scheduled_at ||
      match.venue,
  );

  return (
    <article className="match-summary" aria-labelledby={`match-${match.id}`}>
      <h3 className="sr-only" id={`match-${match.id}`}>
        {match.code}: {team1Name} versus {team2Name}
      </h3>

      <div className="match-summary__header">
        <p className="match-summary__identity">
          <span>{getMatchStageLabel(match)}</span>
          <span aria-hidden="true">·</span>
          <span>{match.code}</span>
        </p>
        <span
          className={`match-status match-status--${match.status}`}
        >
          {getMatchStatusLabel(match.status)}
        </span>
      </div>

      <div className="match-summary__competition">
        {hasScore ? <ScoreDisplay match={match} /> : <MatchTeams match={match} />}
        {outcomeLabel ? (
          <p className="outcome-label">{outcomeLabel}</p>
        ) : null}
      </div>

      {hasDetails ? (
        <dl className="match-summary__details">
          {match.status === "completed" && match.played_at ? (
            <div>
              <dt>Played</dt>
              <dd>{formatTournamentDateTime(match.played_at)}</dd>
            </div>
          ) : null}
          {match.scheduled_at ? (
            <div>
              <dt>Scheduled</dt>
              <dd>{formatTournamentDateTime(match.scheduled_at)}</dd>
            </div>
          ) : null}
          {match.venue ? (
            <div>
              <dt>Venue</dt>
              <dd>{match.venue}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}
