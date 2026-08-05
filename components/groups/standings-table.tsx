import { Lock, Warning } from "@phosphor-icons/react/dist/ssr";

import { TeamName } from "@/components/matches/team-name";
import { DataIntegrityError } from "@/lib/data/errors";
import type { TournamentState } from "@/lib/data/schema";
import type {
  GroupStandings,
  StandingRow,
  UnresolvedTie,
} from "@/lib/standings/calculate";
import { getDisplayedStandingsRows } from "@/lib/standings/presentation";

type StandingsTableProps = {
  standings: GroupStandings;
  tournamentStatus: TournamentState["group_stage_status"];
  completedMatches: number;
  totalMatches: number;
};

type StateTone = "live" | "warning" | "locked";

type ZoneLabel =
  | "Advancing"
  | "Cut-line tie"
  | "All tied"
  | "Outside top 4"
  | "Eliminated";

const ADVANCING_PLACES = 4;

function formatDifference(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function getTieNames(tie: UnresolvedTie, rows: StandingRow[]): string[] {
  const teamsById = new Map(rows.map((row) => [row.team.id, row.team.name]));
  const names = tie.teamIds.map((teamId) => teamsById.get(teamId));

  if (names.some((name) => name === undefined)) {
    throw new DataIntegrityError(
      "Standings contain an unresolved tie for an unknown team.",
    );
  }

  return names.filter((name): name is string => name !== undefined);
}

export function StandingsTable({
  standings,
  tournamentStatus,
  completedMatches,
  totalMatches,
}: StandingsTableProps) {
  const { groupLabel } = standings;
  const groupId = `group-${groupLabel.toLowerCase()}`;
  const isFinalized = tournamentStatus === "finalized";
  const isAllUnplayed = completedMatches === 0;
  const rows = getDisplayedStandingsRows(standings, tournamentStatus);

  // Teams inside a tie that straddles the top-four cut line. An all-unplayed
  // group is a single flat tie rather than a competitive cut-line tie.
  const cutLineTieTeamIds = new Set(
    isFinalized || isAllUnplayed
      ? []
      : standings.unresolvedTies
          .filter(
            (tie) =>
              tie.rank <= ADVANCING_PLACES &&
              tie.rank + tie.teamIds.length - 1 > ADVANCING_PLACES,
          )
          .flatMap((tie) => tie.teamIds),
  );
  const hasCutLineTie = cutLineTieTeamIds.size > 0;
  const visibleTies = isFinalized ? [] : standings.unresolvedTies;

  const state: { tone: StateTone; label: string } = isFinalized
    ? { tone: "locked", label: "Locked" }
    : hasCutLineTie
      ? { tone: "warning", label: "Cut-line tie" }
      : { tone: "live", label: "Live" };

  return (
    <section
      className={`standings-group standings-group--${groupLabel.toLowerCase()}`}
      aria-labelledby={`${groupId}-title`}
    >
      <header className="standings-group__header">
        <div className="standings-group__identity">
          <span
            className={`group-shield group-shield--${groupLabel.toLowerCase()}`}
            aria-hidden="true"
          >
            {groupLabel}
          </span>
          <div>
            <p className="utility-label">Round robin</p>
            <h2 id={`${groupId}-title`}>Group {groupLabel}</h2>
          </div>
        </div>
        <div className="standings-group__meta">
          <p className="standings-group__progress">
            <strong className="figure">{completedMatches}</strong> of{" "}
            <span className="figure">{totalMatches}</span> complete
          </p>
          <span
            className={`status-badge status-badge--${
              state.tone === "warning"
                ? "warning"
                : state.tone === "locked"
                  ? "locked"
                  : "live"
            }`}
          >
            {state.tone === "warning" ? (
              <Warning size={13} weight="fill" aria-hidden="true" />
            ) : state.tone === "locked" ? (
              <Lock size={13} weight="fill" aria-hidden="true" />
            ) : (
              <span className="status-badge__dot" aria-hidden="true" />
            )}
            {state.label}
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="standings-empty">
          <h3>No teams are assigned to Group {groupLabel}.</h3>
          <p>The standings table will appear when the group roster is added.</p>
        </div>
      ) : (
        <>
          <div
            className="standings-table-region"
            role="region"
            aria-label={`Group ${groupLabel} standings table`}
            tabIndex={0}
          >
            <table className="standings-table">
              <caption className="sr-only">
                Group {groupLabel} standings. Rank, team, P is played, W is
                wins, L is losses, sets is set difference, and games is game
                difference. The top four teams advance.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th className="standings-table__col--wide" scope="col">
                    <abbr title="Played">P</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Wins">W</abbr>
                  </th>
                  <th className="standings-table__col--wide" scope="col">
                    <abbr title="Losses">L</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Set difference">Sets</abbr>
                  </th>
                  <th className="standings-table__col--wide" scope="col">
                    <abbr title="Game difference">Games</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isCutLineTie = cutLineTieTeamIds.has(row.team.id);
                  const isAdvancing =
                    !isAllUnplayed &&
                    index < ADVANCING_PLACES &&
                    !isCutLineTie;
                  const isLeader = !isAllUnplayed && index === 0;
                  const zoneLabel: ZoneLabel = isAllUnplayed
                    ? "All tied"
                    : isCutLineTie
                      ? "Cut-line tie"
                      : isAdvancing
                        ? "Advancing"
                        : isFinalized
                          ? "Eliminated"
                          : "Outside top 4";
                  const rowClasses = [
                    "standings-row",
                    isAllUnplayed
                      ? "standings-row--unplayed"
                      : isCutLineTie
                        ? "standings-row--cut-line"
                        : isAdvancing
                          ? "standings-row--advancing"
                          : "standings-row--outside",
                    isLeader ? "standings-row--leader" : null,
                    index === ADVANCING_PLACES ? "standings-row--cut" : null,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr className={rowClasses} key={row.team.id}>
                      <td className="standings-table__rank">{row.rank}</td>
                      <th scope="row">
                        <TeamName
                          className="standings-table__team"
                          name={row.team.name}
                        />
                        <span
                          className={`standings-table__zone standings-table__zone--${
                            isCutLineTie ? "tie" : isAdvancing ? "in" : "out"
                          }`}
                        >
                          {isCutLineTie ? (
                            <Warning
                              size={12}
                              weight="fill"
                              aria-hidden="true"
                            />
                          ) : null}
                          {zoneLabel}
                        </span>
                      </th>
                      <td className="standings-table__col--wide figure">
                        {row.played}
                      </td>
                      <td className="figure">{row.wins}</td>
                      <td className="standings-table__col--wide figure">
                        {row.losses}
                      </td>
                      <td className="figure">
                        {formatDifference(row.setDifference)}
                      </td>
                      <td className="standings-table__col--wide figure">
                        {formatDifference(row.gameDifference)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleTies.length > 0 ? (
            <div className="standings-ties" role="status">
              <h3>
                <Warning size={16} weight="fill" aria-hidden="true" />
                {isAllUnplayed
                  ? "All positions are currently tied"
                  : "Ties to watch"}
              </h3>
              <ul>
                {visibleTies.map((tie) => (
                  <li key={`${tie.rank}-${tie.teamIds.join("-")}`}>
                    Rank {tie.rank}: {getTieNames(tie, rows).join(", ")}
                  </li>
                ))}
              </ul>
              <p>
                {standings.provisional
                  ? "Remaining head-to-head matches may resolve this order."
                  : "Automatic tiebreaks cannot separate these teams."}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
