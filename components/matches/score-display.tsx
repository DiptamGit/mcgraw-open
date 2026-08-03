import type { TournamentMatch } from "../../lib/data/schema";
import { getTeamDisplayName } from "../../lib/matches/presentation";

type ScoreDisplayProps = {
  match: TournamentMatch;
};

function WinnerLabel({
  isWinner,
  children,
}: {
  isWinner: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="score-display__team-name">
      <span>{children}</span>
      {isWinner ? <span className="winner-label">Winner</span> : null}
    </span>
  );
}

export function ScoreDisplay({ match }: ScoreDisplayProps) {
  if (!match.sets || match.sets.length === 0) {
    return null;
  }

  return (
    <div className="score-display">
      <table>
        <caption className="sr-only">Score for match {match.code}</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            {match.sets.map((_, index) => {
              const isMatchTiebreak =
                index === 2 && match.deciding_set_format === "match_tiebreak";

              return (
                <th
                  key={`${match.id}-set-${index + 1}`}
                  scope="col"
                  className={isMatchTiebreak ? "score-display__mtb" : undefined}
                >
                  {isMatchTiebreak ? "MTB" : `S${index + 1}`}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr className={match.winner_id === match.team1_id ? "is-winner" : undefined}>
            <th scope="row">
              <WinnerLabel isWinner={match.winner_id === match.team1_id}>
                {getTeamDisplayName(match, "team1")}
              </WinnerLabel>
            </th>
            {match.sets.map(([team1Score], index) => (
              <td
                key={`${match.id}-team-1-set-${index + 1}`}
                className={
                  index === 2 &&
                  match.deciding_set_format === "match_tiebreak"
                    ? "score-display__mtb"
                    : undefined
                }
              >
                {team1Score}
              </td>
            ))}
          </tr>
          <tr className={match.winner_id === match.team2_id ? "is-winner" : undefined}>
            <th scope="row">
              <WinnerLabel isWinner={match.winner_id === match.team2_id}>
                {getTeamDisplayName(match, "team2")}
              </WinnerLabel>
            </th>
            {match.sets.map(([, team2Score], index) => (
              <td
                key={`${match.id}-team-2-set-${index + 1}`}
                className={
                  index === 2 &&
                  match.deciding_set_format === "match_tiebreak"
                    ? "score-display__mtb"
                    : undefined
                }
              >
                {team2Score}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
