import type { TournamentMatch } from "../../lib/data/schema";
import {
  getTeamDisplayName,
  type MatchSide,
} from "../../lib/matches/presentation";
import { TeamName } from "./team-name";

type ScoreDisplayProps = {
  match: TournamentMatch;
};

function isMatchTiebreakColumn(
  match: TournamentMatch,
  index: number,
): boolean {
  return index === 2 && match.deciding_set_format === "match_tiebreak";
}

function ScoreRow({
  match,
  side,
}: {
  match: TournamentMatch;
  side: MatchSide;
}) {
  const teamId = side === "team1" ? match.team1_id : match.team2_id;
  const isWinner = match.winner_id !== null && match.winner_id === teamId;
  const sets = match.sets ?? [];

  return (
    <tr
      className={`score-display__row${isWinner ? " is-winner" : " is-loser"}`}
    >
      <th scope="row">
        <span className="score-display__team-name">
          <TeamName name={getTeamDisplayName(match, side)} />
          {isWinner ? <span className="winner-label">Winner</span> : null}
        </span>
      </th>
      {sets.map((set, index) => (
        <td
          key={`${match.id}-${side}-set-${index + 1}`}
          className={
            isMatchTiebreakColumn(match, index)
              ? "figure score-display__mtb"
              : "figure"
          }
        >
          {side === "team1" ? set[0] : set[1]}
        </td>
      ))}
    </tr>
  );
}

export function ScoreDisplay({ match }: ScoreDisplayProps) {
  if (!match.sets || match.sets.length === 0) {
    return null;
  }

  const isRetirement = match.outcome_type === "retirement";

  return (
    <div
      className={`score-display${isRetirement ? " score-display--partial" : ""}`}
    >
      {isRetirement ? (
        <p className="score-display__context">Score at retirement</p>
      ) : null}
      <table>
        <caption className="sr-only">
          {isRetirement ? "Partial score" : "Score"} for match {match.code}
        </caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            {match.sets.map((_, index) => {
              const isMatchTiebreak = isMatchTiebreakColumn(match, index);

              return (
                <th
                  key={`${match.id}-set-${index + 1}`}
                  scope="col"
                  className={isMatchTiebreak ? "score-display__mtb" : undefined}
                >
                  <abbr
                    title={isMatchTiebreak ? "Match tiebreak" : `Set ${index + 1}`}
                  >
                    {isMatchTiebreak ? "MTB" : `S${index + 1}`}
                  </abbr>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <ScoreRow match={match} side="team1" />
          <ScoreRow match={match} side="team2" />
        </tbody>
      </table>
    </div>
  );
}
