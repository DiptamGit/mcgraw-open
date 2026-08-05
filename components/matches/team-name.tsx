import { splitTeamName } from "../../lib/matches/presentation";

type TeamNameProps = {
  name: string;
  className?: string;
};

/**
 * Renders a stored team name as a bold nickname over a dim player pair. A name
 * without a separator renders as a single primary label with no empty line.
 */
export function TeamName({ name, className }: TeamNameProps) {
  const { nickname, players } = splitTeamName(name);

  return (
    <span className={className ? `team-name ${className}` : "team-name"}>
      <span className="team-name__nickname">{nickname}</span>
      {players ? (
        <span className="team-name__players">{players}</span>
      ) : null}
    </span>
  );
}
