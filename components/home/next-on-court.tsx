import { CalendarBlank, MapPin } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { TournamentMatch } from "@/lib/data/schema";
import {
  formatTournamentDateTime,
  getMatchStageLabel,
  getTeamDisplayName,
} from "@/lib/matches/presentation";

import { TeamName } from "../matches/team-name";

type NextOnCourtProps = {
  match: TournamentMatch | null;
};

/**
 * The hero's live focus: the soonest scheduled match. It floats over the right
 * of the hero on desktop and sits below it on phone. When nothing is scheduled
 * it becomes an empty state pointing at the full fixture list.
 */
export function NextOnCourt({ match }: NextOnCourtProps) {
  if (match === null) {
    return (
      <aside
        className="next-on-court next-on-court--empty"
        aria-label="Next on court"
      >
        <p className="next-on-court__eyebrow">
          <span className="pulse-dot" aria-hidden="true" />
          Next on court
        </p>
        <p className="next-on-court__empty-title">No match is scheduled yet.</p>
        <p className="next-on-court__empty-body">
          Court times appear here as soon as a fixture is booked.
        </p>
        <Link className="next-on-court__link" href="/matches">
          Browse the fixtures
        </Link>
      </aside>
    );
  }

  const team1Name = getTeamDisplayName(match, "team1");
  const team2Name = getTeamDisplayName(match, "team2");
  const scheduledAt = match.scheduled_at;

  return (
    <aside
      className="next-on-court"
      aria-labelledby={`next-on-court-${match.id}`}
    >
      <div className="next-on-court__header">
        <p className="next-on-court__eyebrow">
          <span className="pulse-dot" aria-hidden="true" />
          Next on court
        </p>
        {scheduledAt !== null ? (
          <span className="status-badge status-badge--scheduled">
            <CalendarBlank size={14} weight="fill" aria-hidden="true" />
            <time className="figure" dateTime={scheduledAt}>
              {formatTournamentDateTime(scheduledAt)}
            </time>
          </span>
        ) : null}
      </div>

      <p className="next-on-court__context">
        <span>{getMatchStageLabel(match)}</span>
        <span aria-hidden="true">·</span>
        <span className="figure">{match.code}</span>
        {match.venue !== null ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="next-on-court__venue">
              <MapPin size={14} weight="bold" aria-hidden="true" />
              <span className="sr-only">Court </span>
              {match.venue}
            </span>
          </>
        ) : null}
      </p>

      <h2 className="sr-only" id={`next-on-court-${match.id}`}>
        Next on court: {team1Name} versus {team2Name}
      </h2>

      <div className="next-on-court__teams">
        <TeamName name={team1Name} className="next-on-court__team" />
        <span className="next-on-court__versus" aria-hidden="true">
          VS
        </span>
        <TeamName name={team2Name} className="next-on-court__team" />
      </div>
    </aside>
  );
}
